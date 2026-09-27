// Génère les icônes de Naakul (iOS, Android adaptatif, splash, notification, favicon).
// Usage : swift scripts/icons/generate.swift node_modules/@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf assets plateglow
// Variantes : ink | sun | sunglow | plate | plateglow (retenue le 27 septembre 2026).

import Foundation
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

// Usage: swift gen2.swift <manrope-extrabold.ttf> <outDir> <variant>
// Variante "sun"  : fond orange de marque, N blanc, point blanc — un signe chaud, lisible de loin.
// Variante "ink"  : fond encre, N blanc, point orange — la version NOIR, recentrée.
let fontPath = CommandLine.arguments[1], outDir = CommandLine.arguments[2], variant = CommandLine.arguments[3]
let fontURL = URL(fileURLWithPath: fontPath) as CFURL
var regErr: Unmanaged<CFError>?
_ = CTFontManagerRegisterFontsForURL(fontURL, .process, &regErr)
guard let descs = CTFontManagerCreateFontDescriptorsFromURL(fontURL) as? [CTFontDescriptor], let desc = descs.first else { fatalError("font") }

func color(_ hex: String) -> CGColor {
    var v: UInt64 = 0; Scanner(string: String(hex.dropFirst())).scanHexInt64(&v)
    return CGColor(colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!, components: [CGFloat((v >> 16) & 0xff) / 255, CGFloat((v >> 8) & 0xff) / 255, CGFloat(v & 0xff) / 255, 1])!
}
let INK = "#1c1b1b", ACCENT = "#FF5733", WARM = "#fcf9f8", WHITE = "#ffffff"

struct Spec { let name: String; let size: Int; let bg: String?; let ink: String; let dot: String?; let glyph: CGFloat; let dotScale: CGFloat; var plate: String? = nil; var glow: Bool = false }

func render(_ s: Spec) {
    let cs = CGColorSpace(name: CGColorSpace.sRGB)!
    let info = s.bg != nil ? CGImageAlphaInfo.noneSkipLast.rawValue : CGImageAlphaInfo.premultipliedLast.rawValue
    let ctx = CGContext(data: nil, width: s.size, height: s.size, bitsPerComponent: 8, bytesPerRow: 0, space: cs, bitmapInfo: info)!
    ctx.setAllowsAntialiasing(true); ctx.setShouldAntialias(true); ctx.setShouldSmoothFonts(true)
    let W = CGFloat(s.size)
    if let bg = s.bg { ctx.setFillColor(color(bg)); ctx.fill(CGRect(x: 0, y: 0, width: W, height: W)) } else { ctx.clear(CGRect(x: 0, y: 0, width: W, height: W)) }
    if s.glow, s.bg != nil {
        // Lumière douce en haut à gauche, ombre en bas à droite : de la profondeur sans texture.
        let g = CGGradient(colorsSpace: cs, colors: [color("#FF7A55"), color("#FF5733"), color("#E8471F")] as CFArray, locations: [0, 0.55, 1])!
        ctx.drawRadialGradient(g, startCenter: CGPoint(x: W * 0.3, y: W * 0.78), startRadius: 0, endCenter: CGPoint(x: W * 0.5, y: W * 0.5), endRadius: W * 0.85, options: [.drawsAfterEndLocation])
    }
    if let plate = s.plate {
        // L'assiette : un disque blanc, 76 % du canevas, qui tient dans le masque rond d'Android comme dans les coins iOS.
        ctx.setFillColor(color(plate))
        let d: CGFloat = s.bg == nil ? 0.52 : 0.76
        ctx.fillEllipse(in: CGRect(x: W * (1 - d) / 2, y: W * (1 - d) / 2, width: W * d, height: W * d))
    }
    let font = CTFontCreateWithFontDescriptor(desc, W * s.glyph, nil)
    let attrs: [NSAttributedString.Key: Any] = [
        NSAttributedString.Key(kCTFontAttributeName as String): font,
        NSAttributedString.Key(kCTForegroundColorAttributeName as String): color(s.ink),
    ]
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: "N", attributes: attrs))
    let b = CTLineGetBoundsWithOptions(line, .useGlyphPathBounds)
    let capH = b.height
    // Le point est celui du logotype « Naakul. » : rond, posé sur la ligne de base,
    // à un demi-fût du N. L'ensemble N + point est centré optiquement (le point
    // pèse moins qu'un fût : on décale d'un tiers de sa largeur).
    let dotD = capH * 0.21 * s.dotScale
    let gap = capH * 0.105
    let totalW = b.width + (s.dot != nil ? gap + dotD : 0)
    let optical = s.dot != nil ? dotD * 0.33 : 0
    let ox = (W - totalW) / 2 - b.minX + optical
    let oy = (W - capH) / 2 - b.minY
    ctx.textPosition = CGPoint(x: ox, y: oy)
    CTLineDraw(line, ctx)
    if let dot = s.dot {
        ctx.setFillColor(color(dot))
        ctx.fillEllipse(in: CGRect(x: ox + b.minX + b.width + gap, y: oy + b.minY, width: dotD, height: dotD))
    }
    let img = ctx.makeImage()!
    let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: outDir + "/" + s.name) as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, img, nil); CGImageDestinationFinalize(dest)
    print("wrote \(s.name) \(s.size)px  N \(Int(b.width))x\(Int(b.height))")
}

let bg = variant == "ink" ? INK : ACCENT
let plateVariant = variant == "plate" || variant == "plateglow"
let dotOnIcon = variant == "ink" ? ACCENT : (plateVariant ? ACCENT : WHITE)
let inkOnIcon = plateVariant ? INK : WHITE
let glow = variant == "sunglow" || variant == "plateglow"
let specs: [Spec] = [
    // iOS : l'ensemble N + point est centré ; sur l'assiette le N est un peu plus petit pour respirer.
    Spec(name: "icon.png", size: 1024, bg: bg, ink: inkOnIcon, dot: dotOnIcon, glyph: plateVariant ? 0.50 : 0.66, dotScale: 1, plate: plateVariant ? WHITE : nil, glow: glow),
    // Android adaptatif : zone sûre = 66 % du canevas → le signe reste sous 44 %.
    Spec(name: "android-icon-foreground.png", size: 512, bg: nil, ink: inkOnIcon, dot: dotOnIcon, glyph: plateVariant ? 0.34 : 0.42, dotScale: 1, plate: plateVariant ? WHITE : nil),
    Spec(name: "android-icon-background.png", size: 512, bg: bg, ink: bg, dot: nil, glyph: 0.0001, dotScale: 1, glow: glow),
    Spec(name: "android-icon-monochrome.png", size: 512, bg: nil, ink: WHITE, dot: WHITE, glyph: 0.42, dotScale: 1),
    // Splash : encre + point orange sur le fond chaud, centré comme un ensemble.
    Spec(name: "splash-icon.png", size: 1024, bg: nil, ink: INK, dot: ACCENT, glyph: 0.62, dotScale: 1),
    Spec(name: "notification-icon.png", size: 96, bg: nil, ink: WHITE, dot: WHITE, glyph: 0.64, dotScale: 1),
    Spec(name: "favicon.png", size: 48, bg: bg, ink: WHITE, dot: dotOnIcon, glyph: 0.66, dotScale: 1),
]
specs.forEach(render)
