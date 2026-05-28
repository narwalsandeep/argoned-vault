import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/site-shell.component').then((m) => m.SiteShellComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/home.page').then((m) => m.HomePageComponent),
      },
      {
        path: 'product',
        loadComponent: () => import('./pages/product.page').then((m) => m.ProductPageComponent),
      },
      {
        path: 'security',
        loadComponent: () => import('./pages/security.page').then((m) => m.SecurityPageComponent),
      },
      {
        path: 'stack',
        redirectTo: 'faq',
        pathMatch: 'full',
      },
      {
        path: 'faq',
        loadComponent: () => import('./pages/faq.page').then((m) => m.FaqPageComponent),
      },
      {
        path: 'pricing',
        loadComponent: () => import('./pages/pricing.page').then((m) => m.PricingPageComponent),
      },
      { path: 'contact', loadComponent: () => import('./pages/contact.page').then((m) => m.ContactPageComponent) },
      { path: 'terms', loadComponent: () => import('./pages/terms.page').then((m) => m.TermsPageComponent) },
      { path: 'privacy', loadComponent: () => import('./pages/privacy.page').then((m) => m.PrivacyPageComponent) },
      { path: 'founders', loadComponent: () => import('./pages/founders.page').then((m) => m.FoundersPageComponent) },
      { path: 'company', loadComponent: () => import('./pages/company.page').then((m) => m.CompanyPageComponent) },
      { path: '**', redirectTo: '', pathMatch: 'full' },
    ],
  },
];
