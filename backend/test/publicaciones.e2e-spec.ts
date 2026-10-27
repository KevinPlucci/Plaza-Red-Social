import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Types } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/** Cabecera de un PNG: alcanza para que se reconozca como imagen. */
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
const SESION = 'X-Usuario-Id';
const ID_INEXISTENTE = '0123456789abcdef01234567';

describe('Publicaciones (e2e)', () => {
  let app: INestApplication<App>;
  let mongo: MongoMemoryServer;
  let conexion: Connection;
  let ana: string;
  let beto: string;
  let admin: string;

  const servidor = () => app.getHttpServer();

  async function crearUsuario(nombreUsuario: string): Promise<string> {
    const { body } = await request(servidor())
      .post('/autenticacion/registro')
      .field('nombre', 'Nombre')
      .field('apellido', 'Apellido')
      .field('correo', `${nombreUsuario}@example.com`)
      .field('nombreUsuario', nombreUsuario)
      .field('contrasena', 'Segura123')
      .field('fechaNacimiento', '1995-05-05')
      .field('descripcion', 'Cuenta de prueba.')
      .attach('imagenPerfil', PNG, { filename: 'perfil.png' })
      .expect(201);
    return body.id as string;
  }

  function publicar(
    usuario: string | null,
    campos: Record<string, string>,
    imagen?: Buffer,
  ) {
    const pedido = request(servidor()).post('/publicaciones');
    if (usuario) pedido.set(SESION, usuario);
    for (const [campo, valor] of Object.entries(campos))
      pedido.field(campo, valor);
    if (imagen) pedido.attach('imagen', imagen, { filename: 'foto.png' });
    return pedido;
  }

  const nueva = async (usuario: string, titulo: string) =>
    (await publicar(usuario, { titulo, mensaje: `Mensaje de ${titulo}` })).body
      .id as string;

  function listar(query = '', usuario?: string) {
    const pedido = request(servidor()).get(`/publicaciones${query}`);
    if (usuario) pedido.set(SESION, usuario);
    return pedido;
  }

  const titulos = (body: unknown) =>
    (body as { publicaciones: { titulo: string }[] }).publicaciones.map(
      (p) => p.titulo,
    );

  const meGusta = (metodo: 'post' | 'delete', id: string, usuario?: string) => {
    const pedido = request(servidor())[metodo](`/publicaciones/${id}/me-gusta`);
    if (usuario) pedido.set(SESION, usuario);
    return pedido;
  };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri('red-social-test');
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();
    conexion = app.get<Connection>(getConnectionToken());

    ana = await crearUsuario('ana');
    beto = await crearUsuario('beto');
    admin = await crearUsuario('admin');
    await conexion
      .collection('usuarios')
      .updateOne(
        { nombreUsuario: 'admin' },
        { $set: { perfil: 'administrador' } },
      );
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await mongo.stop();
  });

  beforeEach(async () => {
    await conexion.collection('publicaciones').deleteMany({});
    await conexion.collection('comentarios').deleteMany({});
  });

  describe('POST /publicaciones', () => {
    it('401 sin sesión', async () => {
      const { status, body } = await publicar(null, {
        titulo: 'a',
        mensaje: 'b',
      });
      expect(status).toBe(401);
      expect(body.message).toBe('Tenés que iniciar sesión para hacer esto.');
    });

    it('401 si el id de la sesión no corresponde a ningún usuario', async () => {
      const { status } = await publicar(ID_INEXISTENTE, {
        titulo: 'a',
        mensaje: 'b',
      });
      expect(status).toBe(401);
    });

    it('400 con un error por campo faltante', async () => {
      const { status, body } = await publicar(ana, { titulo: '   ' });
      expect(status).toBe(400);
      expect(body.message).toEqual([
        'El título es obligatorio.',
        'El mensaje es obligatorio.',
      ]);
    });

    it('201 sin imagen: devuelve la publicación con su autor y sin "Me gusta"', async () => {
      const { status, body } = await publicar(ana, {
        titulo: '  Hola  ',
        mensaje: 'Mi primera publicación.',
        usuario: beto,
      });
      expect(status).toBe(201);
      expect(body).toMatchObject({
        titulo: 'Hola',
        mensaje: 'Mi primera publicación.',
        imagen: null,
        cantidadMeGusta: 0,
        meGustaMio: false,
        usuario: { id: ana, nombreUsuario: 'ana' },
      });
      expect(body.usuario).not.toHaveProperty('correo');
      expect(body).not.toHaveProperty('meGusta');
    });

    it('201 con imagen: la URL guardada sirve el archivo', async () => {
      const { status, body } = await publicar(
        ana,
        { titulo: 'Con foto', mensaje: 'Mirá.' },
        PNG,
      );
      expect(status).toBe(201);
      const imagen = await request(servidor()).get(
        new URL(body.imagen as string).pathname,
      );
      expect(imagen.status).toBe(200);
      expect(imagen.headers['content-type']).toBe('image/png');
    });

    it('400 si el archivo no es una imagen', async () => {
      const { status, body } = await publicar(
        ana,
        { titulo: 'a', mensaje: 'b' },
        Buffer.from('no soy una imagen'),
      );
      expect(status).toBe(400);
      expect(body.message).toBe(
        'El archivo tiene que ser una imagen JPG, PNG, GIF o WEBP.',
      );
    });
  });

  describe('GET /publicaciones', () => {
    it('ordena por fecha (la más nueva primero) y pagina con offset y limit', async () => {
      for (const titulo of ['uno', 'dos', 'tres', 'cuatro', 'cinco'])
        await nueva(ana, titulo);

      const primera = await listar('?limit=2');
      expect(primera.status).toBe(200);
      expect(titulos(primera.body)).toEqual(['cinco', 'cuatro']);
      expect(primera.body).toMatchObject({ total: 5, offset: 0, limit: 2 });

      const tercera = await listar('?limit=2&offset=4');
      expect(titulos(tercera.body)).toEqual(['uno']);
    });

    it('sin parámetros devuelve hasta 10, ordenadas por fecha', async () => {
      await nueva(ana, 'vieja');
      await nueva(beto, 'nueva');
      const { body } = await listar();
      expect(body).toMatchObject({ total: 2, offset: 0, limit: 10 });
      expect(titulos(body)).toEqual(['nueva', 'vieja']);
    });

    it('filtra por usuario', async () => {
      await nueva(ana, 'de ana');
      await nueva(beto, 'de beto');
      const { body } = await listar(`?usuario=${beto}`);
      expect(titulos(body)).toEqual(['de beto']);
      expect(body.total).toBe(1);
    });

    it('400 con parámetros inválidos', async () => {
      const { status, body } = await listar(
        '?orden=popular&limit=0&offset=-1&usuario=x',
      );
      expect(status).toBe(400);
      // Primero los campos propios del DTO y después los heredados de PaginacionDto.
      expect(body.message).toEqual([
        'orden tiene que ser "fecha" o "meGusta".',
        'usuario tiene que ser un id válido.',
        'offset no puede ser negativo.',
        'limit tiene que ser al menos 1.',
      ]);
      expect((await listar('?limit=51')).body.message).toEqual([
        'limit no puede ser mayor que 50.',
      ]);
    });
  });

  describe('"Me gusta"', () => {
    it('201 al dar "Me gusta" y 409 si se repite', async () => {
      const id = await nueva(ana, 'post');
      const primera = await meGusta('post', id, beto);
      expect(primera.status).toBe(201);
      expect(primera.body).toEqual({ cantidadMeGusta: 1, meGustaMio: true });

      const repetida = await meGusta('post', id, beto);
      expect(repetida.status).toBe(409);
      expect(repetida.body.message).toBe(
        'Ya le diste "Me gusta" a esta publicación.',
      );
    });

    it('200 al quitarlo y 404 si no lo había dado', async () => {
      const id = await nueva(ana, 'post');
      await meGusta('post', id, beto);
      const quitado = await meGusta('delete', id, beto);
      expect(quitado.status).toBe(200);
      expect(quitado.body).toEqual({ cantidadMeGusta: 0, meGustaMio: false });

      const otraVez = await meGusta('delete', id, beto);
      expect(otraVez.status).toBe(404);
      expect(otraVez.body.message).toBe(
        'No le habías dado "Me gusta" a esta publicación.',
      );
    });

    it('meGustaMio depende de quién pide el listado', async () => {
      const id = await nueva(ana, 'post');
      await meGusta('post', id, beto);
      expect((await listar('', beto)).body.publicaciones[0].meGustaMio).toBe(
        true,
      );
      expect((await listar('', ana)).body.publicaciones[0].meGustaMio).toBe(
        false,
      );
      expect((await listar()).body.publicaciones[0]).toMatchObject({
        cantidadMeGusta: 1,
        meGustaMio: false,
      });
    });

    it('ordena por cantidad de "Me gusta" y desempata por fecha', async () => {
      const sinVotos = await nueva(ana, 'sin votos');
      const uno = await nueva(ana, 'uno');
      const dos = await nueva(ana, 'dos');
      const otroSinVotos = await nueva(ana, 'otro sin votos');
      await meGusta('post', uno, beto);
      await meGusta('post', dos, beto);
      await meGusta('post', dos, admin);
      expect(sinVotos && otroSinVotos).toBeTruthy();

      const { body } = await listar('?orden=meGusta');
      expect(titulos(body)).toEqual([
        'dos',
        'uno',
        'otro sin votos',
        'sin votos',
      ]);
    });

    it('401 sin sesión y 404 si la publicación no existe', async () => {
      const id = await nueva(ana, 'post');
      expect((await meGusta('post', id)).status).toBe(401);
      expect((await meGusta('post', ID_INEXISTENTE, beto)).status).toBe(404);
      expect((await meGusta('delete', 'no-es-un-id', beto)).status).toBe(404);
    });
  });

  describe('DELETE /publicaciones/:id', () => {
    const eliminar = (id: string, usuario?: string) => {
      const pedido = request(servidor()).delete(`/publicaciones/${id}`);
      if (usuario) pedido.set(SESION, usuario);
      return pedido;
    };

    it('403 si no es el autor ni un administrador', async () => {
      const id = await nueva(ana, 'de ana');
      const { status, body } = await eliminar(id, beto);
      expect(status).toBe(403);
      expect(body.message).toBe(
        'Solo el autor o un administrador pueden eliminar esta publicación.',
      );
    });

    it('204 si la elimina el autor: baja lógica y deja de listarse', async () => {
      const id = await nueva(ana, 'de ana');
      const { status, text } = await eliminar(id, ana);
      expect(status).toBe(204);
      expect(text).toBe('');

      expect((await listar()).body.total).toBe(0);
      const guardada = await conexion
        .collection('publicaciones')
        .findOne({ _id: new Types.ObjectId(id) });
      expect(guardada?.activa).toBe(false);
    });

    it('204 si la elimina un administrador', async () => {
      const id = await nueva(ana, 'de ana');
      expect((await eliminar(id, admin)).status).toBe(204);
    });

    it('una publicación eliminada no admite más acciones', async () => {
      const id = await nueva(ana, 'de ana');
      await eliminar(id, ana);
      expect((await eliminar(id, ana)).status).toBe(404);
      expect((await meGusta('post', id, beto)).status).toBe(404);
      expect(
        (await request(servidor()).get(`/publicaciones/${id}/comentarios`))
          .status,
      ).toBe(404);
    });

    it('401 sin sesión', async () => {
      const id = await nueva(ana, 'de ana');
      expect((await eliminar(id)).status).toBe(401);
    });
  });

  describe('GET /publicaciones/:id/comentarios', () => {
    it('200 con la lista vacía si no hay comentarios', async () => {
      const id = await nueva(ana, 'post');
      const { status, body } = await request(servidor()).get(
        `/publicaciones/${id}/comentarios`,
      );
      expect(status).toBe(200);
      expect(body).toEqual({ comentarios: [], total: 0, offset: 0, limit: 10 });
    });

    it('los más recientes primero, paginados y con su autor', async () => {
      const id = await nueva(ana, 'post');
      const publicacion = new Types.ObjectId(id);
      await conexion.collection('comentarios').insertMany(
        ['primero', 'segundo', 'tercero'].map((mensaje, i) => ({
          publicacion,
          usuario: new Types.ObjectId(beto),
          mensaje,
          modificado: i === 1,
          createdAt: new Date(2026, 9, 1, 10, i),
          updatedAt: new Date(2026, 9, 1, 10, i),
        })),
      );

      const { body } = await request(servidor()).get(
        `/publicaciones/${id}/comentarios?limit=2`,
      );
      expect(body.total).toBe(3);
      expect(
        (body.comentarios as { mensaje: string }[]).map((c) => c.mensaje),
      ).toEqual(['tercero', 'segundo']);
      expect(body.comentarios[1]).toMatchObject({
        modificado: true,
        usuario: { id: beto, nombreUsuario: 'beto' },
      });
    });

    it('404 si la publicación no existe', async () => {
      const { status } = await request(servidor()).get(
        `/publicaciones/${ID_INEXISTENTE}/comentarios`,
      );
      expect(status).toBe(404);
    });
  });
});
