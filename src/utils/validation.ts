import { z } from 'zod';

// Order Form Validation Schema
export const orderFormSchema = z.object({
  vorname: z.string()
    .trim()
    .min(1, 'Vorname ist erforderlich')
    .max(50, 'Vorname darf maximal 50 Zeichen haben')
    .regex(/^[a-zA-ZäöüÄÖÜßéèêëáàâãíìîïóòôõúùûçñ\s\-']+$/u, 
      'Vorname enthält ungültige Zeichen'),
  nachname: z.string()
    .trim()
    .min(1, 'Nachname ist erforderlich')
    .max(50, 'Nachname darf maximal 50 Zeichen haben')
    .regex(/^[a-zA-ZäöüÄÖÜßéèêëáàâãíìîïóòôõúùûçñ\s\-']+$/u, 
      'Nachname enthält ungültige Zeichen'),
  tarif: z.string()
    .min(1, 'Bitte wählen Sie einen Tarif'),
  zusaetze: z.array(z.string()).default([])
});

export type OrderFormData = z.infer<typeof orderFormSchema>;

// Note Validation Schema
export const noteSchema = z.object({
  content: z.string()
    .trim()
    .min(1, 'Notiz darf nicht leer sein')
    .max(500, 'Notiz darf maximal 500 Zeichen haben')
});

// Customer Name Validation Schema
export const customerNameSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Name ist erforderlich')
    .max(100, 'Name darf maximal 100 Zeichen haben')
    .regex(/^[a-zA-ZäöüÄÖÜßéèêëáàâãíìîïóòôõúùûçñ\s\-',.]+$/u, 
      'Name enthält ungültige Zeichen')
});
