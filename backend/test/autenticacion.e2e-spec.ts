import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/** Cabecera de un PNG: alcanza para que se reconozca como imagen. */
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
const ID_INEXISTENTE = '0123456789abcdef01234567';
const SESION_INVALIDA = 'Tu sesión venció o no es válida. Ingresá de nuevo.';

const DATOS = {
  nombre: 'Ana',
  apellido: 'Pérez',
  correo: 'Ana.Perez@Example.com',
  nombreUsuario: 'AnaP',
  contrasena: 'Segura123',
  fechaNacimiento: '1998-04-15',
  posicion: 'Delantero',
  club: '  Club Atlético Banfield  ',
  descripcion: 'Nueve de área, zurda y cabezazo.',
};

/** Payload de un JWT (la parte del medio, en base64url). */
const payload = (token: string) =>
  JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as {
    sub: string;
    nombreUsuario: string;
    perfil: string;
    iat: number;
    exp: number;
  };

const ahora = () => Math.floor(Date.now() / 1000);

describe('Autenticación (e2e)', () => {
  let app: INestApplication<App>;
  let mongo: MongoMemoryServer;
  let conexion: Connection;
  let jwt: JwtService;

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
    jwt = app.get(JwtService);
  }, 120_000);

  afterAll(async () => {
    await app.close();
    await mongo.stop();
  });

  function registrar(
    cambios: Partial<Record<keyof typeof DATOS | 'perfil', string>> = {},
    imagen: Buffer | null = PNG,
  ) {
    const pedido = request(app.getHttpServer()).post('/autenticacion/registro');
    for (const [campo, valor] of Object.entries({ ...DATOS, ...cambios }))
      pedido.field(campo, valor);
    if (imagen)
      pedido.attach('imagenPerfil', imagen, {
        filename: 'perfil.png',
        contentType: 'image/png',
      });
    return pedido;
  }

  const login = (usuario: string, contrasena: string) =>
    request(app.getHttpServer())
      .post('/autenticacion/login')
      .send({ usuario, contrasena });

  /** POST a autorizar o refrescar, con el token si se indica. */
  function conToken(ruta: 'autorizar' | 'refrescar', token?: string) {
    const pedido = request(app.getHttpServer()).post(`/autenticacion/${ruta}`);
    if (token) pedido.set('Authorization', `Bearer ${token}`);
    return pedido;
  }

  /** Token de Ana firmado con la fecha de emisión indicada (para simular uno viejo o vencido). */
  async function tokenEmitido(iat: number): Promise<string> {
    const { body } = await login('anap', 'Segura123');
    return jwt.sign({
      sub: body.usuario.id as string,
      nombreUsuario: 'anap',
      perfil: 'usuario',
      iat,
    });
  }

  describe('POST /autenticacion/registro', () => {
    it('201: guarda el usuario con perfil "usuario", devuelve el token y no la contraseña', async () => {
      const { status, body } = await registrar({ perfil: 'administrador' });

      expect(status).toBe(201);
      expect(body.usuario).toMatchObject({
        nombre: 'Ana',
        apellido: 'Pérez',
        correo: 'ana.perez@example.com',
        nombreUsuario: 'anap',
        posicion: 'delantero',
        club: 'Club Atlético Banfield',
        descripcion: 'Nueve de área, zurda y cabezazo.',
        perfil: 'usuario',
      });
      expect(body.usuario.id).toMatch(/^[a-f\d]{24}$/);
      expect(body.usuario.fechaNacimiento).toBe('1998-04-15T00:00:00.000Z');
      expect(body.usuario).not.toHaveProperty('contrasena');
      expect(body.usuario).not.toHaveProperty('_id');
    });

    it('el token lleva la identidad y el rol, y vence a los 15 minutos', async () => {
      const { body } = await login('anap', 'Segura123');
      const datos = payload(body.token as string);
      expect(datos).toMatchObject({
        sub: body.usuario.id,
        nombreUsuario: 'anap',
        perfil: 'usuario',
      });
      expect(datos.exp - datos.iat).toBe(15 * 60);
    });

    it('guarda la contraseña encriptada', async () => {
      const guardado = await conexion
        .collection('usuarios')
        .findOne({ nombreUsuario: 'anap' });
      expect(guardado?.contrasena).toMatch(/^\$2[aby]\$10\$/);
      expect(guardado?.contrasena).not.toContain('Segura123');
    });

    it('la URL de la imagen de perfil sirve el archivo guardado', async () => {
      const { body } = await login('anap', 'Segura123');
      const ruta = new URL(body.usuario.imagenPerfil as string).pathname;

      const imagen = await request(app.getHttpServer()).get(ruta);
      expect(imagen.status).toBe(200);
      expect(imagen.headers['content-type']).toBe('image/png');
      expect(Buffer.compare(imagen.body as Buffer, PNG)).toBe(0);
    });

    it('201 sin club: es opcional', async () => {
      const { status, body } = await registrar({
        correo: 'sinclub@example.com',
        nombreUsuario: 'sinclub',
        club: '   ',
      });
      expect(status).toBe(201);
      expect(body.usuario).not.toHaveProperty('club');
    });

    it('409 si el correo ya está registrado', async () => {
      const { status, body } = await registrar({ nombreUsuario: 'otra' });
      expect(status).toBe(409);
      expect(body).toMatchObject({
        message: 'El correo ya está registrado.',
        campo: 'correo',
      });
    });

    it('409 si el nombre de usuario ya existe, sin importar mayúsculas', async () => {
      const { status, body } = await registrar({
        correo: 'otra@example.com',
        nombreUsuario: 'ANAP',
      });
      expect(status).toBe(409);
      expect(body).toMatchObject({
        message: 'El nombre de usuario ya está en uso.',
        campo: 'nombreUsuario',
      });
    });

    it.each([
      ['corta', 'Abc123', 'La contraseña debe tener al menos 8 caracteres.'],
      [
        'sin mayúscula',
        'segura123',
        'La contraseña debe tener al menos una mayúscula.',
      ],
      [
        'sin número',
        'Seguraaaa',
        'La contraseña debe tener al menos un número.',
      ],
    ])('400 con contraseña %s', async (_caso, contrasena, mensaje) => {
      const { status, body } = await registrar({
        correo: 'b@example.com',
        nombreUsuario: 'beto',
        contrasena,
      });
      expect(status).toBe(400);
      expect(body.message).toEqual([mensaje]);
    });

    it('400 si la posición no es una de las cuatro', async () => {
      const { status, body } = await registrar({
        correo: 'b@example.com',
        nombreUsuario: 'beto',
        posicion: 'volante',
      });
      expect(status).toBe(400);
      expect(body.message).toEqual([
        'La posición tiene que ser arquero, defensor, mediocampista o delantero.',
      ]);
    });

    it('400 con un solo mensaje por campo faltante o inválido', async () => {
      const { status, body } = await request(app.getHttpServer())
        .post('/autenticacion/registro')
        .field('correo', 'no-es-correo')
        .field('fechaNacimiento', '2999-01-01')
        .field('club', 'x'.repeat(51))
        .attach('imagenPerfil', PNG, {
          filename: 'perfil.png',
          contentType: 'image/png',
        });
      expect(status).toBe(400);
      expect(body.message).toEqual([
        'El nombre es obligatorio.',
        'El apellido es obligatorio.',
        'El correo no es válido.',
        'El nombre de usuario es obligatorio.',
        'La contraseña es obligatoria.',
        'La fecha de nacimiento no puede ser futura.',
        'La posición es obligatoria.',
        'El club no puede superar los 50 caracteres.',
        'La descripción es obligatoria.',
      ]);
    });

    it('400 sin imagen de perfil', async () => {
      const { status, body } = await registrar(
        { correo: 'c@example.com', nombreUsuario: 'carla' },
        null,
      );
      expect(status).toBe(400);
      expect(body.message).toBe('La imagen de perfil es obligatoria.');
    });

    it('400 si el archivo no es una imagen', async () => {
      const { status, body } = await registrar(
        { correo: 'c@example.com', nombreUsuario: 'carla' },
        Buffer.from('<html>no soy una imagen</html>'),
      );
      expect(status).toBe(400);
      expect(body.message).toBe(
        'El archivo tiene que ser una imagen JPG, PNG, GIF o WEBP.',
      );
    });

    it('400 si la imagen supera los 2 MB', async () => {
      const grande = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
      const { status, body } = await registrar(
        { correo: 'c@example.com', nombreUsuario: 'carla' },
        grande,
      );
      expect(status).toBe(400);
      expect(body.message).toBe('La imagen no puede superar los 2 MB.');
    });

    it('los registros rechazados no dejan imágenes huérfanas', async () => {
      // Una por cada cuenta creada: Ana y la que se registró sin club.
      expect(await conexion.collection('imagenes').countDocuments()).toBe(2);
    });
  });

  describe('POST /autenticacion/login', () => {
    it('200 con el token y todos los datos del usuario al ingresar con el nombre de usuario', async () => {
      const { status, body } = await login('AnaP', 'Segura123');
      expect(status).toBe(200);
      expect(body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(body.usuario).toMatchObject({
        nombreUsuario: 'anap',
        correo: 'ana.perez@example.com',
        posicion: 'delantero',
        perfil: 'usuario',
      });
      expect(body.usuario.imagenPerfil).toMatch(/\/imagenes\/[a-f\d]{24}$/);
      expect(body.usuario).not.toHaveProperty('contrasena');
    });

    it('200 al ingresar con el correo', async () => {
      const { status, body } = await login(
        'ana.perez@example.com',
        'Segura123',
      );
      expect(status).toBe(200);
      expect(body.usuario.nombreUsuario).toBe('anap');
    });

    it('401 con la contraseña incorrecta', async () => {
      const { status, body } = await login('anap', 'Incorrecta1');
      expect(status).toBe(401);
      expect(body.message).toBe('Usuario o contraseña incorrectos.');
    });

    it('401 si la cuenta no existe', async () => {
      const { status } = await login('nadie', 'Segura123');
      expect(status).toBe(401);
    });

    it('400 si faltan datos', async () => {
      const { status, body } = await request(app.getHttpServer())
        .post('/autenticacion/login')
        .send({});
      expect(status).toBe(400);
      expect(body.message).toEqual([
        'Ingresá tu correo o nombre de usuario.',
        'Ingresá tu contraseña.',
      ]);
    });
  });

  describe('POST /autenticacion/autorizar', () => {
    it('200 con los datos del usuario si el token es válido', async () => {
      const { body: sesion } = await login('anap', 'Segura123');
      const { status, body } = await conToken(
        'autorizar',
        sesion.token as string,
      );
      expect(status).toBe(200);
      expect(body).toMatchObject({
        id: sesion.usuario.id,
        nombreUsuario: 'anap',
        posicion: 'delantero',
      });
      expect(body).not.toHaveProperty('contrasena');
    });

    it('401 sin token', async () => {
      const { status, body } = await conToken('autorizar');
      expect(status).toBe(401);
      expect(body.message).toBe('Tenés que iniciar sesión para hacer esto.');
    });

    it('401 con un token adulterado o firmado con otra clave', async () => {
      const { body } = await login('anap', 'Segura123');
      const token = body.token as string;
      const [cabecera, datos, firma] = token.split('.');
      const { sub, nombreUsuario } = payload(token);
      const comoAdmin = { sub, nombreUsuario, perfil: 'administrador' };
      const otroPayload = Buffer.from(
        JSON.stringify({ ...payload(token), ...comoAdmin }),
      ).toString('base64url');

      for (const falso of [
        `${cabecera}.${otroPayload}.${firma}`,
        jwt.sign(comoAdmin, { secret: 'otra-clave' }),
        `${cabecera}.${datos}`,
        'no-es-un-token',
      ]) {
        const respuesta = await conToken('autorizar', falso);
        expect(respuesta.status).toBe(401);
        expect(respuesta.body.message).toBe(SESION_INVALIDA);
      }
    });

    it('401 con un token vencido', async () => {
      const vencido = await tokenEmitido(ahora() - 16 * 60);
      const { status, body } = await conToken('autorizar', vencido);
      expect(status).toBe(401);
      expect(body.message).toBe(SESION_INVALIDA);
    });

    it('401 si la cuenta del token ya no existe', async () => {
      const token = jwt.sign({
        sub: ID_INEXISTENTE,
        nombreUsuario: 'fantasma',
        perfil: 'usuario',
      });
      expect((await conToken('autorizar', token)).status).toBe(401);
    });
  });

  describe('POST /autenticacion/refrescar', () => {
    it('200 con un token nuevo: mismo payload y 15 minutos más', async () => {
      // Un token emitido hace 10 minutos: le quedan 5.
      const viejo = await tokenEmitido(ahora() - 10 * 60);
      const { status, body } = await conToken('refrescar', viejo);
      expect(status).toBe(200);

      const antes = payload(viejo);
      const despues = payload(body.token as string);
      expect(despues).toMatchObject({
        sub: antes.sub,
        nombreUsuario: antes.nombreUsuario,
        perfil: antes.perfil,
      });
      expect(despues.exp - despues.iat).toBe(15 * 60);
      expect(despues.exp).toBeGreaterThanOrEqual(antes.exp + 10 * 60);
      expect((await conToken('autorizar', body.token as string)).status).toBe(
        200,
      );
    });

    it('401 si el token ya venció: hay que volver a ingresar', async () => {
      const vencido = await tokenEmitido(ahora() - 16 * 60);
      const { status, body } = await conToken('refrescar', vencido);
      expect(status).toBe(401);
      expect(body.message).toBe(SESION_INVALIDA);
    });

    it('401 sin token', async () => {
      expect((await conToken('refrescar')).status).toBe(401);
    });
  });

  describe('GET /imagenes/:id', () => {
    it('404 si la imagen no existe', async () => {
      const { status } = await request(app.getHttpServer()).get(
        `/imagenes/${ID_INEXISTENTE}`,
      );
      expect(status).toBe(404);
    });
  });
});
