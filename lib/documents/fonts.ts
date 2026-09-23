import 'server-only'

import path from 'node:path'

import { Font } from '@react-pdf/renderer'

// Mêmes familles que le design app (app/globals.css). @fontsource ne fournit
// que du woff/woff2, que le sous-ensembleur de polices utilisé par react-pdf
// (fontkit, pour l'embarquement dans le PDF) ne sait pas ré-encoder de façon
// fiable ("Offset is outside the bounds of the DataView") : il faut du .ttf.
// Fichiers récupérés une fois depuis Google Fonts (assets/fonts/), vendorisés
// dans le repo plutôt que refetchés à chaque build.
let registered = false

export function registerPdfFonts() {
  if (registered) return
  registered = true

  const fontsDir = path.join(process.cwd(), 'assets', 'fonts')

  Font.register({ family: 'Anton', src: path.join(fontsDir, 'Anton-Regular.ttf') })
  Font.register({
    family: 'Space Grotesk',
    fonts: [
      { src: path.join(fontsDir, 'SpaceGrotesk-Regular.ttf'), fontWeight: 400 },
      { src: path.join(fontsDir, 'SpaceGrotesk-Bold.ttf'), fontWeight: 700 },
    ],
  })
  Font.register({ family: 'JetBrains Mono', src: path.join(fontsDir, 'JetBrainsMono-Regular.ttf') })
}
