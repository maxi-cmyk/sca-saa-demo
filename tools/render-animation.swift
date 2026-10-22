import AppKit
import Foundation
import CoreText

struct Point: Decodable { let x: Double; let y: Double }
struct Edge: Decodable { let a: Int; let b: Int; let w: Double; let opacity: Double? }
struct Frame: Decodable { let title: String; let subtitle: String; let footer: String; let points: [Point]; let edges: [Edge]; let colors: [String?]; let iteration: Int }
struct Film: Decodable { let width: Int; let height: Int; let frames: [Frame] }
let args=CommandLine.arguments
let film=try JSONDecoder().decode(Film.self,from:Data(contentsOf:URL(fileURLWithPath:args[1])))
for file in try FileManager.default.contentsOfDirectory(atPath:args[3]) where file.hasSuffix("woff2") {
  CTFontManagerRegisterFontsForURL(URL(fileURLWithPath:args[3]+"/"+file) as CFURL,.process,nil)
}
func color(_ hex: String, _ alpha: Double = 1) -> NSColor {
  let value=UInt32(hex.dropFirst(),radix:16) ?? 0
  return NSColor(srgbRed:Double((value>>16)&255)/255,green:Double((value>>8)&255)/255,blue:Double(value&255)/255,alpha:alpha)
}
func text(_ string: String, _ x: Double, _ y: Double, _ size: Double, _ hex: String, bold: Bool = false) {
  let font=NSFont(name:bold ? "AtkinsonHyperlegible-Bold":"AtkinsonHyperlegible-Regular",size:size) ?? NSFont.systemFont(ofSize:size,weight:bold ? .bold:.regular)
  (string as NSString).draw(at:NSPoint(x:x,y:y),withAttributes:[.font:font,.foregroundColor:color(hex)])
}
for (index,frame) in film.frames.enumerated() {
  autoreleasepool {
    let bitmap=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:film.width,pixelsHigh:film.height,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
    let context=NSGraphicsContext(bitmapImageRep:bitmap)!
    NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current=context
    context.cgContext.translateBy(x:0,y:CGFloat(film.height));context.cgContext.scaleBy(x:1,y:-1)
    color("#0b1d33").setFill();NSRect(x:0,y:0,width:film.width,height:film.height).fill()
    // Flip text back locally; all geometry uses top-left coordinates.
    func label(_ s:String,_ x:Double,_ y:Double,_ size:Double,_ hex:String,_ bold:Bool=false){
      context.saveGraphicsState();context.cgContext.translateBy(x:x,y:y+size*1.2);context.cgContext.scaleBy(x:1,y:-1)
      text(s,0,0,size,hex,bold:bold);context.restoreGraphicsState()
    }
    label(frame.title,40,20,32,"#ffffff",true)
    label(frame.subtitle,40,66,22,"#b4c7de")
    for e in frame.edges {
      let p=frame.points[e.a],q=frame.points[e.b],path=NSBezierPath()
      path.move(to:NSPoint(x:p.x,y:p.y+112));path.line(to:NSPoint(x:q.x,y:q.y+112))
      color("#9db6d6",(e.opacity ?? 1)*0.36).setStroke();path.lineWidth=1.25;path.stroke()
    }
    for (i,p) in frame.points.enumerated() {
      let radius:Double = frame.iteration < 0 ? 10 : 5
      let rect=NSRect(x:p.x-radius,y:p.y+112-radius,width:radius*2,height:radius*2),path=NSBezierPath(ovalIn:rect)
      color(frame.colors[i] ?? "#0b1d33").setFill();path.fill()
      color(frame.colors[i] ?? "#f2e6c9").setStroke();path.lineWidth=2
      if frame.colors[i] == nil { var d:[CGFloat]=[3,3];path.setLineDash(&d,count:2,phase:0) }
      path.stroke()
    }
    color("#24466f").setStroke();let rule=NSBezierPath();rule.move(to:NSPoint(x:40,y:Double(film.height)-62));rule.line(to:NSPoint(x:1560,y:Double(film.height)-62));rule.lineWidth=1;rule.stroke()
    label(frame.footer,40,Double(film.height)-50,23,"#f2e6c9")
    NSGraphicsContext.restoreGraphicsState()
    let png=bitmap.representation(using:.png,properties:[:])!
    try! png.write(to:URL(fileURLWithPath:args[2]+String(format:"/%04d.png",index)))
  }
}
