import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Usuario } from '../../usuarios/schemas/usuario.schema';

/** Comentario de una publicación. Solo su autor lo puede editar, y queda marcado como modificado. */
@Schema({ collection: 'comentarios', timestamps: true })
export class Comentario {
  @Prop({
    type: Types.ObjectId,
    ref: 'Publicacion',
    required: true,
    index: true,
  })
  publicacion: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true })
  usuario: Types.ObjectId;

  @Prop({ required: true, trim: true })
  mensaje: string;

  /** true si el autor editó el comentario. */
  @Prop({ default: false })
  modificado: boolean;
}

export const ComentarioSchema = SchemaFactory.createForClass(Comentario);
