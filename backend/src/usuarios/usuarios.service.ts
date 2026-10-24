import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Perfil, Usuario } from './schemas/usuario.schema';

export type NuevoUsuario = Omit<Usuario, 'perfil'> & { perfil?: Perfil };

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name) private readonly usuarioModel: Model<Usuario>,
  ) {}

  crear(datos: NuevoUsuario) {
    return this.usuarioModel.create(datos);
  }

  async existeCorreo(correo: string): Promise<boolean> {
    return (
      (await this.usuarioModel.exists({ correo: correo.toLowerCase() })) !==
      null
    );
  }

  async existeNombreUsuario(nombreUsuario: string): Promise<boolean> {
    return (
      (await this.usuarioModel.exists({
        nombreUsuario: nombreUsuario.toLowerCase(),
      })) !== null
    );
  }

  /** Busca por correo o por nombre de usuario (los dos son únicos) e incluye el hash de la contraseña. */
  buscarConContrasena(correoOUsuario: string) {
    const valor = correoOUsuario.trim().toLowerCase();
    return this.usuarioModel
      .findOne({ $or: [{ correo: valor }, { nombreUsuario: valor }] })
      .select('+contrasena');
  }

  cambiarPerfil(correoOUsuario: string, perfil: Perfil) {
    const valor = correoOUsuario.trim().toLowerCase();
    return this.usuarioModel.findOneAndUpdate(
      { $or: [{ correo: valor }, { nombreUsuario: valor }] },
      { perfil },
      { returnDocument: 'after' },
    );
  }
}
