import Foundation
import AppKit
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

// Compose une capture « marketing » : un titre en Manrope sur le fond chaud de la
// marque, et la capture brute de l'app dans un cadre arrondi avec une ombre douce.
// Usage : swift scripts/store/compose.swift <manrope-extrabold.ttf> <capture.png> <sortie.png> <largeur> <hauteur> "<titre>"
// App Store 6,9" : 1320 2868 — Google Play : 1080 2160 (ratio 2:1 maximal).
let a = CommandLine.arguments
let fontPath = a[1], input = a[2], output = a[3], W = CGFloat(Int(a[4])!), H = CGFloat(Int(a[5])!), title = a[6]
// 7e argument facultatif : pixels à rogner en haut de la capture (barre d'état iOS, pour une capture Android neutre).
let cropTop = a.count > 7 ? CGFloat(Int(a[7]) ?? 0) : 0
let fontURL = URL(fileURLWithPath: fontPath) as CFURL
var regErr: Unmanaged<CFError>?
_ = CTFontManagerRegisterFontsForURL(fontURL, .process, &regErr)
guard let descs = CTFontManagerCreateFontDescriptorsFromURL(fontURL) as? [CTFontDescriptor], let desc = descs.first else { fatalError("font") }
func color(_ hex: String, _ alpha: CGFloat = 1) -> CGColor {
    var v: UInt64 = 0; Scanner(string: String(hex.dropFirst())).scanHexInt64(&v)
    return CGColor(colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!, components: [CGFloat((v >> 16) & 0xff) / 255, CGFloat((v >> 8) & 0xff) / 255, CGFloat(v & 0xff) / 255, alpha])!
}
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
let ctx = CGContext(data: nil, width: Int(W), height: Int(H), bitsPerComponent: 8, bytesPerRow: 0, space: cs, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
ctx.setAllowsAntialiasing(true); ctx.setShouldAntialias(true); ctx.setShouldSmoothFonts(true)
// Fond : le blanc chaud de l'app, avec une lueur orange très douce en haut.
ctx.setFillColor(color("#fcf9f8")); ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
let glow = CGGradient(colorsSpace: cs, colors: [color("#FF5733", 0.16), color("#FF5733", 0)] as CFArray, locations: [0, 1])!
ctx.drawRadialGradient(glow, startCenter: CGPoint(x: W * 0.85, y: H * 0.92), startRadius: 0, endCenter: CGPoint(x: W * 0.85, y: H * 0.92), endRadius: W * 0.9, options: [])
// Titre : deux lignes maximum, Manrope ExtraBold, encre.
let fontSize = W * 0.062
let font = CTFontCreateWithFontDescriptor(desc, fontSize, nil)
let para = NSMutableParagraphStyle(); para.alignment = .center; para.lineSpacing = fontSize * 0.08
let attrs: [NSAttributedString.Key: Any] = [
    NSAttributedString.Key(kCTFontAttributeName as String): font,
    NSAttributedString.Key(kCTForegroundColorAttributeName as String): color("#1c1b1b"),
    NSAttributedString.Key(kCTKernAttributeName as String): -fontSize * 0.02,
    .paragraphStyle: para,
]
let attributed = NSAttributedString(string: title, attributes: attrs)
let setter = CTFramesetterCreateWithAttributedString(attributed)
let textInset = W * 0.08
let textBox = CGSize(width: W - textInset * 2, height: fontSize * 3.2)
let fitted = CTFramesetterSuggestFrameSizeWithConstraints(setter, CFRange(location: 0, length: 0), nil, textBox, nil)
let textTop = H * 0.055
let textRect = CGRect(x: textInset, y: H - textTop - fitted.height, width: textBox.width, height: fitted.height)
let path = CGPath(rect: textRect, transform: nil)
let frame = CTFramesetterCreateFrame(setter, CFRange(location: 0, length: 0), path, nil)
CTFrameDraw(frame, ctx)
// Capture : chargée telle quelle, placée sous le titre, coins arrondis, ombre douce, débord en bas.
let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: input) as CFURL, nil)!
let full = CGImageSourceCreateImageAtIndex(src, 0, nil)!
let shot = cropTop > 0 ? full.cropping(to: CGRect(x: 0, y: Int(cropTop), width: full.width, height: full.height - Int(cropTop)))! : full
let shotW = CGFloat(shot.width), shotH = CGFloat(shot.height)
let availableTop = textRect.minY - H * 0.035
let scale = (W * 0.82) / shotW
let drawW = shotW * scale, drawH = shotH * scale
let x = (W - drawW) / 2
let y = availableTop - drawH   // peut être négatif : la capture déborde en bas, comme sur les fiches Apple
let rect = CGRect(x: x, y: y, width: drawW, height: drawH)
let radius = W * 0.07
ctx.saveGState()
ctx.setShadow(offset: CGSize(width: 0, height: -W * 0.02), blur: W * 0.06, color: color("#1c1b1b", 0.18))
ctx.setFillColor(color("#1c1b1b")); ctx.addPath(CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)); ctx.fillPath()
ctx.restoreGState()
ctx.saveGState()
ctx.addPath(CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil)); ctx.clip()
ctx.draw(shot, in: rect)
ctx.restoreGState()
let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: output) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, ctx.makeImage()!, nil); CGImageDestinationFinalize(dest)
print("écrit \(output) \(Int(W))x\(Int(H))")
