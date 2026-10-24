import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const PERFILES = ['usuario', 'administrador'] as const;
export type Perfil = (typeof PERFILES)[number];

@Schema({
  collection: 'usuarios',
  timestamps: true,
  toJSON: {
    versionKey: false,
    // Lo que sale en las respuestas: "id" en vez de "_id" y nunca el hash de la contraseña.
    transform: (_documento, datos: Record<string, unknown>) => {
      datos.id = String(datos._id);
      delete datos._id;
      delete datos.contrasena;
      return datos;
    },
  },
})
export class Usuario {
  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true, trim: true })
  apellido: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  correo: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  nombreUsuario: string;

  /** Hash de bcrypt. Con select: false no se trae en las consultas salvo que se pida explícitamente. */
  @Prop({ required: true, select: false })
  contrasena: string;

  @Prop({ required: true })
  fechaNacimiento: Date;

  @Prop({ required: true, trim: true })
  descripcion: string;

  /** URL pública de la imagen de perfil. */
  @Prop({ required: true })
  imagenPerfil: string;

  @Prop({ type: String, enum: PERFILES, default: 'usuario' })
  perfil: Perfil;
}

export type UsuarioDocument = HydratedDocument<Usuario>;
export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
