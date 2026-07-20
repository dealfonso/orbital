import { parse } from "https://cdn.jsdelivr.net/npm/opentype.js@2.0.0/dist/opentype.mjs";
import { SvgDocument } from "./svg.js";
import "https://unpkg.com/wawoff2@2.0.1/build/decompress_binding.js";

async function loadFont(filePath) {
    const buffer = await fetch(filePath);
    const font = parse(await buffer.arrayBuffer());
    return font;
}

async function loadGoogleFont(fontName) {
    const fontUrl = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}&display=swap`;
    const response = await fetch(fontUrl);
    const buffer = await response.arrayBuffer();

    const cssText = new TextDecoder("utf-8").decode(buffer);
    const latinMatch = cssText.match(
    /@font-face\s*{[^}]*src:\s*url\(([^)]+)\)[^}]*unicode-range:\s*U\+0000-00FF[^}]*}/s
    );

    if (latinMatch) {
        const fontFileUrl = latinMatch[1];
        const fontResponse = await fetch(fontFileUrl);
        const fontBuffer = await fontResponse.arrayBuffer();

        // If it is a WOFF2 file, decompress it using the WOFF2 library
        let decompressedBuffer;
        if (fontFileUrl.endsWith('.woff2')) {
            decompressedBuffer = Module.decompress(fontBuffer);
        } else {
            decompressedBuffer = fontBuffer;
        }

        const font = parse(decompressedBuffer);
        console.log(`Loaded Google Font: ${fontName}`);
        return font;
    }
    return null;
}

async function crearTexto(o = {}) {
    const fontSize = o.fontSize ?? 100;
    const text = o.text ?? "orbital";
    const color = o.color ?? "currentColor";
    const googleFontName = o.googleFontName ?? null;
    const fontPath = o.fontPath ?? null;

    if (!googleFontName && !fontPath) {
        throw new Error("Either googleFontName or fontPath must be provided.");
    }
    
    const font = googleFontName ? await loadGoogleFont(googleFontName) : await loadFont(fontPath);
    const path = font.getPath(text, 0, 0, fontSize);

    const svg = path.toSVG({flipY: false});
    const ns = "http://www.w3.org/2000/svg";
    const svgNode = document.createElementNS(ns, "svg");
    svgNode.innerHTML = svg; // Set the innerHTML of the SVG element to the combined SVG content

    // Calculate the bounding box of the text
    const bbox = SvgDocument.fromElement(svgNode).getBoundingBox();

    // Set the viewBox and dimensions based on the bounding box
    svgNode.setAttribute("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    svgNode.setAttribute("width", bbox.width);
    svgNode.setAttribute("height", bbox.height);
    svgNode.setAttribute("fill", color); // Set the fill color for the text
    return svgNode;
}

export async function crearIsotipo(o = {}) {
    // Tomamos los parámetros del objeto o, o usamos valores por defecto
    const orbitStroke = o.orbitStroke ?? 14;
    const orbitRadius = o.orbitRadius ?? 160;
    const orbitColor = o.orbitColor ?? "currentColor";
    const coreRadius = o.coreRadius ?? 72;
    const coreStroke = o.coreStroke ?? 14;
    const coreColor = o.coreColor ?? "currentColor";
    const planetRadius = o.planetRadius ?? 26;
    const planetOffset = o.planetOffset ?? 8;
    const planetColor = o.planetColor ?? "currentColor";
    const planetClearance = o.planetClearance ?? 14;
    const angle1 = o.angle1 ?? 37 + 90;
    const angle2 = o.angle2 ?? 213 + 90;
    const linecap = o.linecap ?? "butt";

    function polar(a,r){
        const t=a*Math.PI/180;
        return {x:orbitRadius+r*Math.cos(t),y:orbitRadius+r*Math.sin(t)};
    }
    function gapAngle(){
        const d=planetRadius+planetClearance;
        return 2*Math.asin(Math.min(d,orbitRadius-0.001)/orbitRadius)*180/Math.PI;
    }
    function arc(s,e){
        const p1=polar(s,orbitRadius);
        const p2=polar(e,orbitRadius);
        const delta=((e-s)+360)%360;
        const large=delta>180?1:0;
        return `M ${p1.x.toFixed(3)} ${p1.y.toFixed(3)}
                A ${orbitRadius} ${orbitRadius} 0 ${large} 1 ${p2.x.toFixed(3)} ${p2.y.toFixed(3)}`;
    }

    const gap = gapAngle() / 2;
    const orbita = SvgDocument
                    .path(arc(angle1 + gap, angle2 - gap))
                    .path(arc(angle2 + gap, angle1 - gap + 360))
                    .fill("none").stroke({ color: orbitColor, width: orbitStroke, linecap: linecap });

    const core = SvgDocument.circle(coreRadius, orbitRadius, orbitRadius).fill("none").stroke({ color: coreColor, width: coreStroke });

    let isotipo = new SvgDocument(orbita).compose(core, orbitRadius / 2 + orbitStroke / 2, orbitRadius / 2 + orbitStroke / 2);

    [angle1, angle2].forEach(a => {
        const pt = polar(a, orbitRadius + planetOffset);
        const planet = SvgDocument.circle(planetRadius).fill(planetColor);
        isotipo = isotipo.compose(planet, pt.x - planetRadius , pt.y - planetRadius);
    });

    return isotipo.toElement();
}

async function _crearElementosLogo(o = {}) {
    const isotipo = await crearIsotipo(o);

    let svgIsotipo = SvgDocument.fromElement(isotipo)
        .fitViewBoxToContent()
        .moveToOrigin(); // Move to origin and fit viewBox with padding for the orbit stroke

    let titulo = await crearTexto({...o,
        text: o.titleText ?? "orbital",
        fontSize: o.fontSizeTitle ?? 100,
        fontPath: o.titleFontPath ?? null,
        googleFontName: o.titleGoogleFontName ?? "Comfortaa",
        color: o.titleColor ?? "currentColor"
    });

    let svgTitulo = SvgDocument.fromElement(titulo)
        .fitViewBoxToContent()
        .moveToOrigin();

    let subtitulo = await crearTexto({
        ...o,
        text: o.subtitleText ?? "STATE • FLOW • EXPERIENCE",
        fontSize: o.fontSizeSubtitle ?? 16,
        fontPath: o.subtitleFontPath ?? null,
        googleFontName: o.subtitleGoogleFontName ?? "Space Grotesk",
        color: o.subtitleColor ?? "currentColor"
    });
    let svgSubtitulo = SvgDocument.fromElement(subtitulo)
        .fitViewBoxToContent()
        .moveToOrigin();

    return {
        isotipo: svgIsotipo,
        titulo: svgTitulo,
        subtitulo: svgSubtitulo,
    };
}

async function crearLogo(o = {}) {
    let { isotipo, titulo, subtitulo } = await _crearElementosLogo(o);
    const orbitStroke = o.orbitStroke ?? 14; // Default orbit stroke width
    return isotipo.fitViewBoxToContent().growViewBox(orbitStroke / 2).toElement();
}

async function crearLogoH(o = {}) {
    let { isotipo, titulo, subtitulo } = await _crearElementosLogo({
        ...o,
        fontSizeTitle: o.fontSizeTitle ?? 208,
        fontSizeSubtitle: o.fontSizeSubtitle ?? 32,
    });
    const bbox = {
        isotipo: isotipo.getBoundingBox(),
        titulo: titulo.getBoundingBox(),
        subtitulo: subtitulo.getBoundingBox(),
    };

    const centerThings = o.centerThings ?? true;
    const lineHeight = o.lineHeight ?? 0.25; // Default line height between title and subtitle
    const orbitStroke = o.orbitStroke ?? 14; // Default orbit stroke width
    const textGap = o.textGap ?? 24; // Default gap between isotipo and text

    let offsetX = textGap + orbitStroke / 2; // Default offsetX to half of orbitStroke
    let offsetY = 0;

    if (centerThings) {
        const isotipoHeight = bbox.isotipo.height;
        const tituloHeight = bbox.titulo.height;
        const subtituloHeight = bbox.subtitulo.height;

        const textHeight = tituloHeight + (1 + lineHeight) * subtituloHeight;
        offsetY = (isotipoHeight - textHeight) / 2;
    }

    const svgBuilder = new SvgDocument(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
    const svgLogo = svgBuilder
        .compose(isotipo)
        .compose(titulo.translate(bbox.isotipo.width + offsetX, offsetY))
        .compose(subtitulo.translate(bbox.isotipo.width + offsetX, bbox.titulo.height + offsetY + (1 + lineHeight) * bbox.subtitulo.height))
        .fitViewBoxToContent()
        .growViewBox(orbitStroke / 2);

    return svgLogo.toElement();
}

async function crearLogoV(o = {}) {
    let { isotipo, titulo, subtitulo } = await _crearElementosLogo(o);
    const bbox = {
        isotipo: isotipo.getBoundingBox(),
        titulo: titulo.getBoundingBox(),
        subtitulo: subtitulo.getBoundingBox(),
    };
    const centerThings = o.centerThings ?? true;

    if (centerThings) {
        // Center the title and subtitle horizontally based on the isotipo width
        const isotipoWidth = bbox.isotipo.width;
        const tituloWidth = bbox.titulo.width;
        const subtituloWidth = bbox.subtitulo.width;

        const tituloOffsetX = (isotipoWidth - tituloWidth) / 2;
        const subtituloOffsetX = (isotipoWidth - subtituloWidth) / 2;

        titulo = titulo.translate(tituloOffsetX, 0);
        subtitulo = subtitulo.translate(subtituloOffsetX, 0);
    }

    const svgBuilder = new SvgDocument(document.createElementNS("http://www.w3.org/2000/svg", "svg"));
    const orbitStroke = o.orbitStroke ?? 14; // Default orbit stroke width
    const lineHeight = o.lineHeight ?? 0.25; // Default line height between title and subtitle
    const textGap = o.textGap ?? 12; // Default gap between isotipo and text

    const svgLogo = svgBuilder
        .compose(isotipo)
        .compose(titulo, 0, bbox.isotipo.height + textGap)
        .compose(subtitulo, 0, bbox.isotipo.height + textGap + bbox.titulo.height + (1 + lineHeight) * bbox.subtitulo.height)
        .fitViewBoxToContent()
        .growViewBox({
            top: orbitStroke / 2
        }); // Grow the viewBox to account for the orbit stroke

    const logoSvgNode = svgLogo.toElement();
    return logoSvgNode;
}

export {
    crearLogo,
    crearLogoH,
    crearLogoV,
}