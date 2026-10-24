/**
 * Cambia el perfil de una cuenta existente.
 * Uso: npm run perfil -- <correo o nombre de usuario> <usuario|administrador>
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Perfil, PERFILES } from '../usuarios/schemas/usuario.schema';
import { UsuariosService } from '../usuarios/usuarios.service';

async function main() {
  const [cuenta, perfil] = process.argv.slice(2);
  if (!cuenta || !PERFILES.includes(perfil as Perfil)) {
    console.error(
      'Uso: npm run perfil -- <correo o nombre de usuario> <usuario|administrador>',
    );
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  const usuario = await app
    .get(UsuariosService)
    .cambiarPerfil(cuenta, perfil as Perfil);
  console.log(
    usuario
      ? `@${usuario.nombreUsuario} ahora tiene el perfil "${usuario.perfil}".`
      : `No existe la cuenta "${cuenta}".`,
  );
  if (!usuario) process.exitCode = 1;
  await app.close();
}
void main();
