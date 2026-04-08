# Stone Setting Pro — Guía para Claude Code

## Design System: IBM Carbon Design System

Referencia oficial: https://carbondesignsystem.com
Componentes React: https://react.carbondesignsystem.com
Tokens: https://carbondesignsystem.com/elements/color/tokens

### Colores principales (Carbon tokens)
- Background: $background (#ffffff light / #161616 dark)
- Primary (Interactive): $interactive (#0f62fe)
- Primary hover: $hover-primary (#0353e9)
- Text primary: $text-primary (#161616)
- Text secondary: $text-secondary (#525252)
- Text disabled: $text-disabled (#c6c6c6)
- Border subtle: $border-subtle (#e0e0e0)
- Border strong: $border-strong (#8d8d8d)
- Support success: $support-success (#24a148)
- Support error: $support-error (#da1e28)
- Support warning: $support-warning (#f1c21b)
- Support info: $support-info (#0043ce)
- Layer 01: $layer-01 (#f4f4f4)
- Layer 02: $layer-02 (#ffffff)

### Tipografía (IBM Plex Sans)
- Font family: 'IBM Plex Sans', sans-serif
- Heading large: 2rem / 600
- Heading medium: 1.5rem / 600
- Heading small: 1.25rem / 600
- Body long 02: 1rem / 400 / line-height 1.5
- Body short 02: 0.875rem / 400
- Label: 0.75rem / 400
- Helper text: 0.75rem / 400 / italic

### Espaciado (Carbon spacing scale)
- $spacing-01: 2px
- $spacing-02: 4px
- $spacing-03: 8px
- $spacing-04: 12px
- $spacing-05: 16px
- $spacing-06: 24px
- $spacing-07: 32px
- $spacing-08: 40px
- $spacing-09: 48px
- $spacing-10: 64px

### Bordes y radios
- Sin border-radius por defecto (Carbon usa esquinas cuadradas)
- Border width: 1px

### Iconografía
- Librería: @carbon/icons-react
- Tamaños estándar: 16px, 20px, 24px, 32px

### Componentes Carbon disponibles
- Button (primary, secondary, tertiary, ghost, danger)
- TextInput, TextArea, Select, Dropdown
- DataTable con sorting y filtering
- Modal, Notification (inline, toast)
- Tag, Accordion, Tabs
- Loading spinner, ProgressIndicator

## Proyecto

- Stack: React 19 + Create React App
- Deploy: Vercel
- Base de datos: Supabase
- Ambientes:
  - Production: rama main → cliente usa esto
  - Staging: rama staging → Cindy prueba aquí antes de subir

## Reglas de desarrollo

1. Siempre trabajar en rama staging primero
2. Nunca hacer cambios directos en main
3. Usar tokens de Carbon, no valores hardcodeados
4. Los componentes siguen las guías de Carbon: https://carbondesignsystem.com/components
5. Antes de hacer merge a main, probar en la URL de preview de Vercel
