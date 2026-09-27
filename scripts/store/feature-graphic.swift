import Foundation
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

// Image de présentation Google Play (1024 × 500) : logotype « Naakul. » et promesse sur le fond orange à lueur douce.
// Usage : swift scripts/store/feature-graphic.swift <manrope-extrabold.ttf> <inter-medium.ttf> <sortie.png>
let a = CommandLine.arguments
let W: CGFloat = 1024, H: CGFloat = 500
func register(_ p: String) -> CTFontDescriptor {
    var e: Unmanaged<CFError>?; _ = CTFontManagerRegisterFontsForURL(URL(fileURLWithPath: p) as CFURL, .process, &e)
    return (CTFontManagerCreateFontDescriptorsFromURL(URL(fileURLWithPath: p) as CFURL) as! [CTFontDescriptor]).first!
}
let display = register(a[1]), body = register(a[2])
func color(_ hex: String, _ alpha: CGFloat = 1) -> CGColor {
    var v: UInt64 = 0; Scanner(string: String(hex.dropFirst())).scanHexInt64(&v)
    return CGColor(colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!, components: [CGFloat((v >> 16) & 0xff) / 255, CGFloat((v >> 8) & 0xff) / 255, CGFloat(v & 0xff) / 255, alpha])!
}
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
let ctx = CGContext(data: nil, width: Int(W), height: Int(H), bitsPerComponent: 8, bytesPerRow: 0, space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
ctx.setAllowsAntialiasing(true); ctx.setShouldAntialias(true); ctx.setShouldSmoothFonts(true)
ctx.setFillColor(color("#FF5733")); ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
let g = CGGradient(colorsSpace: cs, colors: [color("#FF7A55"), color("#FF5733"), color("#E8471F")] as CFArray, locations: [0, 0.55, 1])!
ctx.drawRadialGradient(g, startCenter: CGPoint(x: W * 0.2, y: H * 0.8), startRadius: 0, endCenter: CGPoint(x: W * 0.5, y: H * 0.5), endRadius: W * 0.75, options: [.drawsAfterEndLocation])
// L'assiette de l'icône, à droite, avec le « N. »
let plateD: CGFloat = 340
let plate = CGRect(x: W - plateD - 70, y: (H - plateD) / 2, width: plateD, height: plateD)
ctx.setShadow(offset: CGSize(width: 0, height: -10), blur: 40, color: color("#7A1F08", 0.25))
ctx.setFillColor(color("#FFFFFF")); ctx.fillEllipse(in: plate)
ctx.setShadow(offset: .zero, blur: 0, color: nil)
func draw(_ text: String, _ desc: CTFontDescriptor, _ size: CGFloat, _ col: String, at origin: CGPoint, kern: CGFloat = 0) -> CGRect {
    let font = CTFontCreateWithFontDescriptor(desc, size, nil)
    let attrs: [NSAttributedString.Key: Any] = [NSAttributedString.Key(kCTFontAttributeName as String): font, NSAttributedString.Key(kCTForegroundColorAttributeName as String): color(col), NSAttributedString.Key(kCTKernAttributeName as String): kern]
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: attrs))
    let b = CTLineGetBoundsWithOptions(line, .useGlyphPathBounds)
    ctx.textPosition = origin; CTLineDraw(line, ctx); return b
}
// « N » encre + point orange, centrés dans l'assiette
let nSize = plateD * 0.5
let nFont = CTFontCreateWithFontDescriptor(display, nSize, nil)
let nLine = CTLineCreateWithAttributedString(NSAttributedString(string: "N", attributes: [NSAttributedString.Key(kCTFontAttributeName as String): nFont, NSAttributedString.Key(kCTForegroundColorAttributeName as String): color("#1c1b1b")]))
let nb = CTLineGetBoundsWithOptions(nLine, .useGlyphPathBounds)
let dotD = nb.height * 0.21, gap = nb.height * 0.105
let total = nb.width + gap + dotD
let nx = plate.midX - total / 2 - nb.minX + dotD * 0.33, ny = plate.midY - nb.height / 2 - nb.minY
ctx.textPosition = CGPoint(x: nx, y: ny); CTLineDraw(nLine, ctx)
ctx.setFillColor(color("#FF5733")); ctx.fillEllipse(in: CGRect(x: nx + nb.minX + nb.width + gap, y: ny + nb.minY, width: dotD, height: dotD))
// Texte à gauche
_ = draw("Naakul", display, 96, "#FFFFFF", at: CGPoint(x: 70, y: H * 0.56), kern: -2)
_ = draw("Les tables de N’Djamena,", body, 34, "#FFFFFF", at: CGPoint(x: 72, y: H * 0.56 - 62))
_ = draw("livrées chez vous.", body, 34, "#FFFFFF", at: CGPoint(x: 72, y: H * 0.56 - 108))
_ = draw("PAIEMENT EN ESPÈCES À LA LIVRAISON", body, 18, "#FFE1D4", at: CGPoint(x: 72, y: H * 0.56 - 170), kern: 2)
let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[3]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, ctx.makeImage()!, nil); CGImageDestinationFinalize(dest); print("écrit \(a[3])")
