import { Routes } from '@angular/router';
import { invitadoGuard, sesionGuard } from './core/guards/sesion.guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'publicaciones' },
  {
    path: 'cargando',
    title: 'Entrando · Vestuario',
    loadComponent: () => import('./pages/cargando/cargando').then((m) => m.Cargando),
  },
  {
    path: 'login',
    title: 'Ingresar · Vestuario',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    title: 'Crear cuenta · Vestuario',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/registro/registro').then((m) => m.Registro),
  },
  {
    path: 'publicaciones',
    title: 'Publicaciones · Vestuario',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/publicaciones/publicaciones').then((m) => m.Publicaciones),
  },
  {
    path: 'publicaciones/:id',
    title: 'Publicación · Vestuario',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/publicacion/publicacion').then((m) => m.PaginaPublicacion),
  },
  {
    path: 'mi-perfil',
    title: 'Mi perfil · Vestuario',
    canActivate: [sesionGuard],
    loadComponent: () => import('./pages/mi-perfil/mi-perfil').then((m) => m.MiPerfil),
  },
  {
    path: '**',
    title: 'Página no encontrada · Vestuario',
    loadComponent: () => import('./pages/no-encontrada/no-encontrada').then((m) => m.NoEncontrada),
  },
];
