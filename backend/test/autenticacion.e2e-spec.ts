import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/** Cabecera de un PNG: alcanza para que se reconozca como imagen. */
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

const DATOS = {
  nombre: 'Ana',
  apellido: 'Pérez',
  correo: 'Ana.Perez@Example.com',
  nombreUsuario: 'AnaP',
  contrasena: 'Segura123',
  fechaNacimiento: '1998-04-15',
  descripcion: 'Me gusta la fotografía.',
};

describe('Autenticación (e2e)', () => {
  let app: INestApplication<App>;
  let mongo: MongoMemoryServer;
  let conexion: Connection;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri('red-social-test');
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    await app.init();
    conexion = app.get<Connection>(getConnectionToken());
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

  describe('POST /autenticacion/registro', () => {
    it('201: guarda el usuario con perfil "usuario" y no devuelve la contraseña', async () => {
      const { status, body } = await registrar({ perfil: 'administrador' });

      expect(status).toBe(201);
      expect(body).toMatchObject({
        nombre: 'Ana',
        apellido: 'Pérez',
        correo: 'ana.perez@example.com',
        nombreUsuario: 'anap',
        descripcion: 'Me gusta la fotografía.',
        perfil: 'usuario',
      });
      expect(body.id).toMatch(/^[a-f\d]{24}$/);
      expect(body.fechaNacimiento).toBe('1998-04-15T00:00:00.000Z');
      expect(body).not.toHaveProperty('contrasena');
      expect(body).not.toHaveProperty('_id');
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
      const ruta = new URL(body.imagenPerfil as string).pathname;

      const imagen = await request(app.getHttpServer()).get(ruta);
      expect(imagen.status).toBe(200);
      expect(imagen.headers['content-type']).toBe('image/png');
      expect(Buffer.compare(imagen.body as Buffer, PNG)).toBe(0);
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

    it('400 con un solo mensaje por campo faltante o inválido', async () => {
      const { status, body } = await request(app.getHttpServer())
        .post('/autenticacion/registro')
        .field('correo', 'no-es-correo')
        .field('fechaNacimiento', '2999-01-01')
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
      expect(await conexion.collection('imagenes').countDocuments()).toBe(1);
    });
  });

  describe('POST /autenticacion/login', () => {
    it('200 con todos los datos del usuario al ingresar con el nombre de usuario', async () => {
      const { status, body } = await login('AnaP', 'Segura123');
      expect(status).toBe(200);
      expect(body).toMatchObject({
        nombreUsuario: 'anap',
        correo: 'ana.perez@example.com',
        perfil: 'usuario',
      });
      expect(body.imagenPerfil).toMatch(/\/imagenes\/[a-f\d]{24}$/);
      expect(body).not.toHaveProperty('contrasena');
    });

    it('200 al ingresar con el correo', async () => {
      const { status, body } = await login(
        'ana.perez@example.com',
        'Segura123',
      );
      expect(status).toBe(200);
      expect(body.nombreUsuario).toBe('anap');
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

  describe('GET /imagenes/:id', () => {
    it('404 si la imagen no existe', async () => {
      const { status } = await request(app.getHttpServer()).get(
        '/imagenes/0123456789abcdef01234567',
      );
      expect(status).toBe(404);
    });
  });
});
