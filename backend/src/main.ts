import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // El front se sirve desde otro dominio, así que solo se aceptan pedidos de los orígenes configurados.
  const origenes = config
    .get<string>('CORS_ORIGEN', 'http://localhost:4200')
    .split(',')
    .map((origen) => origen.trim());
  app.enableCors({ origin: origenes });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
