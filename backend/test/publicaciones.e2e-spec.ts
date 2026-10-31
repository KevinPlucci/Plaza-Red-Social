import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Types } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/** Cabecera de un PNG: alcanza para que se reconozca como imagen. */
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
const ID_INEXISTENTE = '0123456789abcdef01234567';
const SIN_SESION = 'Tenés que iniciar sesión para hacer esto.';

/** Cuenta de prueba: su id y el token que devolvió el registro. */
interface Cuenta {
  id: string;
  token: string;
}

describe('Publicaciones (e2e)', () => {
  let app: INestApplication<App>;
  let mongo: MongoMemoryServer;
  let conexion: Connection;
  let ana: Cuenta;
  let beto: Cuenta;
  let admin: Cuenta;

  const servidor = () => app.getHttpServer();

  /** Agrega el token de la cuenta al pedido. Sin cuenta (o con null), el pedido va sin sesión. */
  const con = (pedido: request.Test, cuenta?: Cuenta | null) =>
    cuenta ? pedido.set('Authorization', `Bearer ${cuenta.token}`) : pedido;

  async function crearUsuario(
    nombreUsuario: string,
    posicion = 'mediocampista',
  ): Promise<Cuenta> {
    const { body } = await request(servidor())
      .post('/autenticacion/registro')
      .field('nombre', 'Nombre')
      .field('apellido', 'Apellido')
      .field('correo', `${nombreUsuario}@example.com`)
      .field('nombreUsuario', nombreUsuario)
      .field('contrasena', 'Segura123')
      .field('fechaNacimiento', '1995-05-05')
      .field('posicion', posicion)
      .field('descripcion', 'Cuenta de prueba.')
      .attach('imagenPerfil', PNG, { filename: 'perfil.png' })
      .expect(201);
    return { id: body.usuario.id as string, token: body.token as string };
  }

  function publicar(
    cuenta: Cuenta | undefined,
    campos: Record<string, string>,
    imagen?: Buffer,
  ) {
    const pedido = con(request(servidor()).post('/publicaciones'), cuenta);
    for (const [campo, valor] of Object.entries(campos))
      pedido.field(campo, valor);
    if (imagen) pedido.attach('imagen', imagen, { filename: 'foto.png' });
    return pedido;
  }

  const nueva = async (cuenta: Cuenta, titulo: string) =>
    (await publicar(cuenta, { titulo, mensaje: `Mensaje de ${titulo}` })).body
      .id as string;

  const listar = (query = '', cuenta: Cuenta | null = ana) =>
    con(request(servidor()).get(`/publicaciones${query}`), cuenta);

  const titulos = (body: unknown) =>
    (body as { publicaciones: { titulo: string }[] }).publicaciones.map(
      (p) => p.titulo,
    );

  const meGusta = (metodo: 'post' | 'delete', id: string, cuenta?: Cuenta) =>
    con(request(servidor())[metodo](`/publicaciones/${id}/me-gusta`), cuenta);

  const comentarios = (id: string, query = '', cuenta: Cuenta | null = ana) =>
    con(
      request(servidor()).get(`/publicaciones/${id}/comentarios${query}`),
      cuenta,
    );

  const comentar = (id: string, mensaje: unknown, cuenta?: Cuenta) =>
    con(
      request(servidor()).post(`/publicaciones/${id}/comentarios`),
      cuenta,
    ).send({ mensaje });

  const editarComentario = (
    id: string,
    idComentario: string,
    mensaje: unknown,
    cuenta?: Cuenta,
  ) =>
    con(
      request(servidor()).put(
        `/publicaciones/${id}/comentarios/${idComentario}`,
      ),
      cuenta,
    ).send({ mensaje });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri('red-social-test');
    process.env.JWT_SECRETO = 'secreto-de-prueba';
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();
    conexion = app.get<Connection>(getConnectionToken());

    ana = await crearUsuario('ana', 'delantero');
    beto = await crearUsuario('beto', 'arquero');
    admin = await crearUsuario('admin');
    // El perfil se lee de la base en cada pedido, así que el token de admin ya sirve como administrador.
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
      const { status, body } = await publicar(undefined, {
        titulo: 'a',
        mensaje: 'b',
      });
      expect(status).toBe(401);
      expect(body.message).toBe(SIN_SESION);
    });

    it('401 si el token es de una cuenta que no existe', async () => {
      const token = app.get(JwtService).sign({
        sub: ID_INEXISTENTE,
        nombreUsuario: 'fantasma',
        perfil: 'usuario',
      });
      const { status } = await publicar(
        { id: ID_INEXISTENTE, token },
        { titulo: 'a', mensaje: 'b' },
      );
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

    it('201 sin imagen: devuelve la publicación con su autor, sin "Me gusta" ni comentarios', async () => {
      const { status, body } = await publicar(ana, {
        titulo: '  Hola  ',
        mensaje: 'Mi primera publicación.',
        usuario: beto.id,
      });
      expect(status).toBe(201);
      expect(body).toMatchObject({
        titulo: 'Hola',
        mensaje: 'Mi primera publicación.',
        imagen: null,
        cantidadMeGusta: 0,
        meGustaMio: false,
        cantidadComentarios: 0,
        usuario: { id: ana.id, nombreUsuario: 'ana', posicion: 'delantero' },
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
    it('401 sin sesión: el listado ya no es público', async () => {
      const { status, body } = await listar('', null);
      expect(status).toBe(401);
      expect(body.message).toBe(SIN_SESION);
    });

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
      const { body } = await listar(`?usuario=${beto.id}`);
      expect(titulos(body)).toEqual(['de beto']);
      expect(body.total).toBe(1);
    });

    it('cada publicación trae la cantidad de comentarios', async () => {
      const comentada = await nueva(ana, 'comentada');
      await nueva(ana, 'sin comentarios');
      await comentar(comentada, 'Golazo', beto);
      await comentar(comentada, 'Gracias', ana);

      const { body } = await listar();
      expect(
        (
          body.publicaciones as {
            titulo: string;
            cantidadComentarios: number;
          }[]
        ).map((p) => [p.titulo, p.cantidadComentarios]),
      ).toEqual([
        ['sin comentarios', 0],
        ['comentada', 2],
      ]);
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

  describe('GET /publicaciones/:id', () => {
    const obtener = (id: string, cuenta?: Cuenta) =>
      con(request(servidor()).get(`/publicaciones/${id}`), cuenta);

    it('200 con la misma forma que en el listado, según quién la pide', async () => {
      const id = await nueva(ana, 'post');
      await meGusta('post', id, beto);
      await comentar(id, 'Buena', beto);

      const { status, body } = await obtener(id, beto);
      expect(status).toBe(200);
      expect(body).toMatchObject({
        id,
        titulo: 'post',
        cantidadMeGusta: 1,
        meGustaMio: true,
        cantidadComentarios: 1,
        usuario: { id: ana.id, nombreUsuario: 'ana' },
      });
      expect((await obtener(id, ana)).body.meGustaMio).toBe(false);
    });

    it('404 si no existe, si el id no es válido o si fue eliminada', async () => {
      const id = await nueva(ana, 'post');
      await con(request(servidor()).delete(`/publicaciones/${id}`), ana);
      for (const otro of [ID_INEXISTENTE, 'no-es-un-id', id]) {
        const { status, body } = await obtener(otro, ana);
        expect(status).toBe(404);
        expect(body.message).toBe('La publicación no existe.');
      }
    });

    it('401 sin sesión', async () => {
      const id = await nueva(ana, 'post');
      expect((await obtener(id)).status).toBe(401);
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
      expect((await listar('', beto)).body.publicaciones[0]).toMatchObject({
        cantidadMeGusta: 1,
        meGustaMio: true,
      });
      expect((await listar('', ana)).body.publicaciones[0]).toMatchObject({
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
    const eliminar = (id: string, cuenta?: Cuenta) =>
      con(request(servidor()).delete(`/publicaciones/${id}`), cuenta);

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
      const { body: comentario } = await comentar(id, 'Antes de borrar', beto);
      await eliminar(id, ana);
      expect((await eliminar(id, ana)).status).toBe(404);
      expect((await meGusta('post', id, beto)).status).toBe(404);
      expect((await comentarios(id)).status).toBe(404);
      expect((await comentar(id, 'Tarde', beto)).status).toBe(404);
      expect(
        (await editarComentario(id, comentario.id as string, 'Otro', beto))
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
      const { status, body } = await comentarios(id);
      expect(status).toBe(200);
      expect(body).toEqual({ comentarios: [], total: 0, offset: 0, limit: 10 });
    });

    it('los más recientes primero, paginados y con su autor', async () => {
      const id = await nueva(ana, 'post');
      const publicacion = new Types.ObjectId(id);
      await conexion.collection('comentarios').insertMany(
        ['primero', 'segundo', 'tercero'].map((mensaje, i) => ({
          publicacion,
          usuario: new Types.ObjectId(beto.id),
          mensaje,
          modificado: i === 1,
          createdAt: new Date(2026, 9, 1, 10, i),
          updatedAt: new Date(2026, 9, 1, 10, i),
        })),
      );

      const { body } = await comentarios(id, '?limit=2');
      expect(body.total).toBe(3);
      expect(
        (body.comentarios as { mensaje: string }[]).map((c) => c.mensaje),
      ).toEqual(['tercero', 'segundo']);
      expect(body.comentarios[1]).toMatchObject({
        modificado: true,
        usuario: { id: beto.id, nombreUsuario: 'beto', posicion: 'arquero' },
      });

      const resto = await comentarios(id, '?limit=2&offset=2');
      expect(
        (resto.body.comentarios as { mensaje: string }[]).map((c) => c.mensaje),
      ).toEqual(['primero']);
    });

    it('404 si la publicación no existe', async () => {
      expect((await comentarios(ID_INEXISTENTE)).status).toBe(404);
    });

    it('401 sin sesión', async () => {
      const id = await nueva(ana, 'post');
      expect((await comentarios(id, '', null)).status).toBe(401);
    });
  });

  describe('POST /publicaciones/:id/comentarios', () => {
    it('201 con el autor, la fecha y sin marca de editado; aparece primero en el listado', async () => {
      const id = await nueva(ana, 'post');
      await comentar(id, 'Primero', ana);
      const { status, body } = await comentar(id, '  ¡Qué golazo!  ', beto);

      expect(status).toBe(201);
      expect(body).toMatchObject({
        mensaje: '¡Qué golazo!',
        modificado: false,
        usuario: { id: beto.id, nombreUsuario: 'beto' },
      });
      expect(body.id).toMatch(/^[a-f\d]{24}$/);
      expect(Date.parse(body.createdAt as string)).not.toBeNaN();
      expect(body.usuario).not.toHaveProperty('correo');

      const listado = await comentarios(id);
      expect(listado.body.total).toBe(2);
      expect(listado.body.comentarios[0].id).toBe(body.id);
    });

    it('400 si el mensaje está vacío, no es texto o supera los 500 caracteres', async () => {
      const id = await nueva(ana, 'post');
      for (const [mensaje, error] of [
        ['   ', 'El comentario no puede estar vacío.'],
        [undefined, 'El comentario no puede estar vacío.'],
        [42, 'El comentario no puede estar vacío.'],
        ['x'.repeat(501), 'El comentario no puede superar los 500 caracteres.'],
      ]) {
        const { status, body } = await comentar(id, mensaje, beto);
        expect(status).toBe(400);
        expect(body.message).toEqual([error]);
      }
      expect((await comentarios(id)).body.total).toBe(0);
    });

    it('401 sin sesión y 404 si la publicación no existe', async () => {
      const id = await nueva(ana, 'post');
      expect((await comentar(id, 'Hola')).status).toBe(401);
      expect((await comentar(ID_INEXISTENTE, 'Hola', beto)).status).toBe(404);
    });
  });

  describe('PUT /publicaciones/:id/comentarios/:idComentario', () => {
    it('200: cambia el mensaje y lo marca como modificado', async () => {
      const id = await nueva(ana, 'post');
      const { body: original } = await comentar(id, 'Golazo', beto);

      const { status, body } = await editarComentario(
        id,
        original.id as string,
        ' Golazo de media cancha ',
        beto,
      );
      expect(status).toBe(200);
      expect(body).toMatchObject({
        id: original.id,
        mensaje: 'Golazo de media cancha',
        modificado: true,
        createdAt: original.createdAt,
      });
      expect((await comentarios(id)).body.comentarios[0]).toMatchObject({
        mensaje: 'Golazo de media cancha',
        modificado: true,
      });
    });

    it('403 si no es el autor, aunque sea administrador', async () => {
      const id = await nueva(ana, 'post');
      const { body: comentario } = await comentar(id, 'De beto', beto);
      for (const otro of [ana, admin]) {
        const { status, body } = await editarComentario(
          id,
          comentario.id as string,
          'Cambiado',
          otro,
        );
        expect(status).toBe(403);
        expect(body.message).toBe('Solo podés editar tus propios comentarios.');
      }
    });

    it('404 si el comentario no existe o es de otra publicación', async () => {
      const id = await nueva(ana, 'post');
      const otra = await nueva(ana, 'otra');
      const { body: comentario } = await comentar(otra, 'En otra', beto);
      for (const idComentario of [
        ID_INEXISTENTE,
        'no-es-un-id',
        comentario.id as string,
      ]) {
        const { status, body } = await editarComentario(
          id,
          idComentario,
          'Cambiado',
          beto,
        );
        expect(status).toBe(404);
        expect(body.message).toBe('El comentario no existe.');
      }
    });

    it('400 con un mensaje vacío y 401 sin sesión', async () => {
      const id = await nueva(ana, 'post');
      const { body: comentario } = await comentar(id, 'Hola', beto);
      const vacio = await editarComentario(
        id,
        comentario.id as string,
        '  ',
        beto,
      );
      expect(vacio.status).toBe(400);
      expect(vacio.body.message).toEqual([
        'El comentario no puede estar vacío.',
      ]);
      expect(
        (await editarComentario(id, comentario.id as string, 'Chau')).status,
      ).toBe(401);
    });
  });
});
