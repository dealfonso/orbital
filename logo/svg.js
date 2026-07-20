const SVG_NS = "http://www.w3.org/2000/svg";

export class SvgDocument {
	constructor(rootElement) {
        if (rootElement instanceof SvgDocument) {
            this._root = rootElement._root.cloneNode(true);
            return;
        }
		if (!(rootElement instanceof SVGElement) || rootElement.tagName.toLowerCase() !== "svg") {
			throw new Error("SvgDocument requires an <svg> root element");
		}
		this._root = rootElement;
	}

	/**
	 * Crea un documento SVG vacío.
	 * @param {Object} options - Opciones de creación.
	 * @param {number} options.width - Ancho inicial del SVG.
	 * @param {number} options.height - Alto inicial del SVG.
	 * @param {Array|Object|string|null} options.viewBox - Valor inicial del viewBox.
	 * @param {Object} options.attrs - Atributos adicionales para el root SVG.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	static create({ width = 300, height = 150, viewBox = null, attrs = {} } = {}) {
		const root = document.createElementNS(SVG_NS, "svg");
		root.setAttribute("width", String(width));
		root.setAttribute("height", String(height));

		if (viewBox) {
			root.setAttribute("viewBox", SvgDocument._normalizeViewBox(viewBox));
		}

		SvgDocument._setAttributes(root, attrs);
		return new SvgDocument(root);
	}

	/**
	 * Crea un documento SVG que contiene un path.
	 * @param {string} d - Valor del atributo d del path.
	 * @param {Object} attrs - Atributos del path, por ejemplo fill, stroke o stroke-width.
	 * @param {number} padding - Margen extra alrededor del contenido.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	static path(d, attrs = {}, padding = 0) {
		const path = document.createElementNS(SVG_NS, "path");
		path.setAttribute("d", d);
		SvgDocument._setAttributes(path, attrs);
		return SvgDocument._primitive(path, padding, attrs);
	}

	/**
	 * Crea un documento SVG que contiene un círculo.
	 * @param {number} r - Radio del círculo.
	 * @param {number} x - Coordenada X del centro.
	 * @param {number} y - Coordenada Y del centro.
	 * @param {Object} attrs - Atributos del círculo, por ejemplo fill, stroke o stroke-width.
	 * @param {number} padding - Margen extra alrededor del contenido.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	static circle(r, x = 0, y = 0, attrs = {}, padding = 0) {
		const circle = document.createElementNS(SVG_NS, "circle");
		circle.setAttribute("r", String(r));
		circle.setAttribute("cx", String(x));
		circle.setAttribute("cy", String(y));
		SvgDocument._setAttributes(circle, attrs);
		return SvgDocument._primitive(circle, padding, attrs);
	}

	/**
	 * Crea un documento SVG que contiene un rectángulo.
	 * @param {number} width - Ancho del rectángulo.
	 * @param {number} height - Alto del rectángulo.
	 * @param {number} x - Coordenada X de la esquina superior izquierda.
	 * @param {number} y - Coordenada Y de la esquina superior izquierda.
	 * @param {Object} attrs - Atributos del rectángulo, por ejemplo fill, stroke o stroke-width.
	 * @param {number} padding - Margen extra alrededor del contenido.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	static rect(width, height, x = 0, y = 0, attrs = {}, padding = 0) {
		const rect = document.createElementNS(SVG_NS, "rect");
		rect.setAttribute("width", String(width));
		rect.setAttribute("height", String(height));
		rect.setAttribute("x", String(x));
		rect.setAttribute("y", String(y));
		SvgDocument._setAttributes(rect, attrs);
		return SvgDocument._primitive(rect, padding, attrs);
	}

	/**
	 * Crea un documento SVG que contiene una línea.
	 * @param {number} x1 - Coordenada X del punto inicial.
	 * @param {number} y1 - Coordenada Y del punto inicial.
	 * @param {number} x2 - Coordenada X del punto final.
	 * @param {number} y2 - Coordenada Y del punto final.
	 * @param {Object} attrs - Atributos de la línea, por ejemplo stroke o stroke-width.
	 * @param {number} padding - Margen extra alrededor del contenido.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	static line(x1, y1, x2, y2, attrs = {}, padding = 0) {
		const line = document.createElementNS(SVG_NS, "line");
		line.setAttribute("x1", String(x1));
		line.setAttribute("y1", String(y1));
		line.setAttribute("x2", String(x2));
		line.setAttribute("y2", String(y2));
		SvgDocument._setAttributes(line, attrs);
		return SvgDocument._primitive(line, padding, attrs);
	}

	/**
	 * Añade un path al SVG actual y devuelve un nuevo documento.
	 * @param {string} d - Valor del atributo d del path.
	 * @param {Object} attrs - Atributos del path, por ejemplo fill, stroke o stroke-width.
	 * @param {number} padding - Margen extra opcional para ajustar el viewBox tras añadir el path.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	path(d, attrs = {}, padding = 0) {
		const path = document.createElementNS(SVG_NS, "path");
		path.setAttribute("d", d);
		SvgDocument._setAttributes(path, attrs);
		return this._appendPrimitive(path, padding);
	}

	/**
	 * Añade un círculo al SVG actual y devuelve un nuevo documento.
	 * @param {number} r - Radio del círculo.
	 * @param {number} x - Coordenada X del centro.
	 * @param {number} y - Coordenada Y del centro.
	 * @param {Object} attrs - Atributos del círculo, por ejemplo fill, stroke o stroke-width.
	 * @param {number} padding - Margen extra opcional para ajustar el viewBox tras añadir el círculo.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	circle(r, x = 0, y = 0, attrs = {}, padding = 0) {
		const circle = document.createElementNS(SVG_NS, "circle");
		circle.setAttribute("r", String(r));
		circle.setAttribute("cx", String(x));
		circle.setAttribute("cy", String(y));
		SvgDocument._setAttributes(circle, attrs);
		return this._appendPrimitive(circle, padding);
	}

	/**
	 * Añade un rectángulo al SVG actual y devuelve un nuevo documento.
	 * @param {number} width - Ancho del rectángulo.
	 * @param {number} height - Alto del rectángulo.
	 * @param {number} x - Coordenada X de la esquina superior izquierda.
	 * @param {number} y - Coordenada Y de la esquina superior izquierda.
	 * @param {Object} attrs - Atributos del rectángulo, por ejemplo fill, stroke o stroke-width.
	 * @param {number} padding - Margen extra opcional para ajustar el viewBox tras añadir el rectángulo.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	rect(width, height, x = 0, y = 0, attrs = {}, padding = 0) {
		const rect = document.createElementNS(SVG_NS, "rect");
		rect.setAttribute("width", String(width));
		rect.setAttribute("height", String(height));
		rect.setAttribute("x", String(x));
		rect.setAttribute("y", String(y));
		SvgDocument._setAttributes(rect, attrs);
		return this._appendPrimitive(rect, padding);
	}

	/**
	 * Añade una línea al SVG actual y devuelve un nuevo documento.
	 * @param {number} x1 - Coordenada X del punto inicial.
	 * @param {number} y1 - Coordenada Y del punto inicial.
	 * @param {number} x2 - Coordenada X del punto final.
	 * @param {number} y2 - Coordenada Y del punto final.
	 * @param {Object} attrs - Atributos de la línea, por ejemplo stroke o stroke-width.
	 * @param {number} padding - Margen extra opcional para ajustar el viewBox tras añadir la línea.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	line(x1, y1, x2, y2, attrs = {}, padding = 0) {
		const line = document.createElementNS(SVG_NS, "line");
		line.setAttribute("x1", String(x1));
		line.setAttribute("y1", String(y1));
		line.setAttribute("x2", String(x2));
		line.setAttribute("y2", String(y2));
		SvgDocument._setAttributes(line, attrs);
		return this._appendPrimitive(line, padding);
	}

	static fromString(svgText) {
		if (typeof svgText !== "string" || !svgText.trim()) {
			throw new Error("fromString expects a non-empty SVG string");
		}

		const parser = new DOMParser();
		const doc = parser.parseFromString(svgText, "image/svg+xml");
		const parseError = doc.querySelector("parsererror");
		if (parseError) {
			throw new Error("Invalid SVG string");
		}

		const root = doc.documentElement;
		if (!root || root.tagName.toLowerCase() !== "svg") {
			throw new Error("SVG string must contain an <svg> root");
		}

		return new SvgDocument(root.cloneNode(true));
	}

	static fromElement(svgElement) {
		if (!(svgElement instanceof SVGElement) || svgElement.tagName.toLowerCase() !== "svg") {
			throw new Error("fromElement expects an <svg> element");
		}
		return new SvgDocument(svgElement.cloneNode(true));
	}

	clone() {
		return new SvgDocument(this._root.cloneNode(true));
	}

	toElement() {
		return this._root.cloneNode(true);
	}

    svg() {
        return this.toString();
    }

	toString() {
		const serializer = new XMLSerializer();
		return serializer.serializeToString(this._root);
	}

	getViewBox() {
		const viewBox = this._root.getAttribute("viewBox");
		if (!viewBox) return null;

		const values = viewBox
			.trim()
			.split(/[\s,]+/)
			.map(Number)
			.filter((n) => Number.isFinite(n));

		if (values.length !== 4) return null;
		return { x: values[0], y: values[1], width: values[2], height: values[3] };
	}

	getBoundingBox() {
		const clone = this._root.cloneNode(true);
		const sandbox = document.createElement("div");
		sandbox.style.position = "absolute";
		sandbox.style.left = "-999999px";
		sandbox.style.top = "-999999px";
		sandbox.style.width = "0";
		sandbox.style.height = "0";
		sandbox.style.visibility = "hidden";
		sandbox.style.overflow = "hidden";

		document.body.appendChild(sandbox);
		sandbox.appendChild(clone);

		try {
			const bbox = clone.getBBox();
			return { x: bbox.x, y: bbox.y, width: bbox.width, height: bbox.height };
		} catch (_error) {
			const viewBox = this.getViewBox();
			if (viewBox) return viewBox;

			const width = Number(this._root.getAttribute("width")) || 0;
			const height = Number(this._root.getAttribute("height")) || 0;
			return { x: 0, y: 0, width, height };
		} finally {
			sandbox.remove();
		}
	}

	/**
	 * Centra el contenido del SVG en un punto.
	 * @param {number} x - Coordenada X del punto destino.
	 * @param {number} y - Coordenada Y del punto destino.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	center(x = 0, y = 0) {
		const bbox = this.getBoundingBox();
		const currentCenterX = bbox.x + bbox.width / 2;
		const currentCenterY = bbox.y + bbox.height / 2;
		return this.translate(x - currentCenterX, y - currentCenterY);
	}

	/**
	 * Mueve el contenido para que su esquina superior izquierda quede en un punto.
	 * @param {number} x - Coordenada X destino.
	 * @param {number} y - Coordenada Y destino.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	moveTo(x = 0, y = 0) {
		const bbox = this.getBoundingBox();
		return this.translate(x - bbox.x, y - bbox.y);
	}

	/**
	 * Establece el color CSS base del SVG para usar currentColor.
	 * @param {string} value - Color CSS.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	color(value) {
		return this.withAttribute("color", value);
	}

	/**
	 * Establece el relleno del SVG.
	 * @param {string} value - Valor de fill.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	fill(value) {
		return this.withAttribute("fill", value);
	}

	/**
	 * Establece el color del trazo.
	 * @param {string | object} value - Valor de stroke (o un objeto con propiedades { stroke, strokeWidth, linecap }).
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	stroke(value) {
        if (typeof value === "object" && value !== null) {
            const color = value.color ?? null;
            const width = value.width ?? null;
            const linecap = value.linecap ?? null;
            const attributes = {};
            if (color !== null) attributes.stroke = color;
            if (width !== null) attributes["stroke-width"] = width;
            if (linecap !== null) attributes["stroke-linecap"] = linecap;
            return this.withAttributes(attributes);
        }
		return this.withAttribute("stroke", value);
	}

	/**
	 * Establece el ancho del trazo.
	 * @param {number} value - Grosor del stroke.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	strokeWidth(value) {
		return this.withAttribute("stroke-width", value);
	}

	/**
	 * Establece el tipo de terminación del trazo.
	 * @param {string} value - Valor de stroke-linecap.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	linecap(value) {
		return this.withAttribute("stroke-linecap", value);
	}

	/**
	 * Establece la opacidad del SVG.
	 * @param {number} value - Opacidad entre 0 y 1.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	opacity(value) {
		return this.withAttribute("opacity", value);
	}

	/**
	 * Establece o elimina un atributo arbitrario del root SVG.
	 * @param {string} name - Nombre del atributo.
	 * @param {string|number|null} value - Valor del atributo o null para eliminarlo.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	attr(name, value) {
		return this.withAttribute(name, value);
	}

	withAttribute(name, value) {
		const root = this._root.cloneNode(true);
		if (value === null || value === undefined) {
			root.removeAttribute(name);
		} else {
			root.setAttribute(name, String(value));
		}
		return new SvgDocument(root);
	}

	withAttributes(attrs = {}) {
		const root = this._root.cloneNode(true);
		SvgDocument._setAttributes(root, attrs);
		return new SvgDocument(root);
	}

	setSize(width, height) {
		const root = this._root.cloneNode(true);
		root.setAttribute("width", String(width));
		root.setAttribute("height", String(height));
		return new SvgDocument(root);
	}

	setViewBox(x, y, width, height) {
		const root = this._root.cloneNode(true);
		root.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
		return new SvgDocument(root);
	}

	addNode(nodeOrText) {
		const root = this._root.cloneNode(true);
		let node = null;

		if (typeof nodeOrText === "string") {
			const wrapper = document.createElementNS(SVG_NS, "svg");
			wrapper.innerHTML = nodeOrText;
			node = wrapper.firstElementChild;
		} else if (nodeOrText instanceof Element) {
			node = nodeOrText;
		}

		if (!node) {
			throw new Error("addNode expects an Element or SVG markup string");
		}

		root.appendChild(node.cloneNode(true));
		return new SvgDocument(root);
	}

	compose(other, x = 0, y = 0) {
		const otherSvg = SvgDocument._coerceToSvgDocument(other);
		const root = this._root.cloneNode(true);
		const nested = otherSvg.toElement();

		nested.setAttribute("x", String(x));
		nested.setAttribute("y", String(y));
		// Prevent nested viewport clipping when the composed SVG content is transformed.
		nested.setAttribute("overflow", "visible");
		root.appendChild(nested);

		return new SvgDocument(root);
	}

	translate(dx = 0, dy = 0) {
		return this.transform(`translate(${dx} ${dy})`);
	}

	scale(sx = 1, sy = sx, originX = 0, originY = 0) {
		return this.transform(`translate(${originX} ${originY}) scale(${sx} ${sy}) translate(${-originX} ${-originY})`);
	}

	rotate(angleDeg = 0, originX = 0, originY = 0) {
		return this.transform(`rotate(${angleDeg} ${originX} ${originY})`);
	}

	transform(transformValue) {
		const root = this._root.cloneNode(true);
		// Keep transformed content visible even if it leaves the original viewBox.
		root.setAttribute("overflow", "visible");
		const group = document.createElementNS(SVG_NS, "g");
		group.setAttribute("transform", transformValue);

		while (root.firstChild) {
			group.appendChild(root.firstChild);
		}

		root.appendChild(group);
		return new SvgDocument(root);
	}

	fitViewBoxToContent(padding = 0) {
		const bbox = this.getBoundingBox();
		const p = Number.isFinite(padding) ? padding : 0;

		const x = bbox.x - p;
		const y = bbox.y - p;
		const width = Math.max(0, bbox.width + p * 2);
		const height = Math.max(0, bbox.height + p * 2);

		const next = this.setViewBox(x, y, width, height).setSize(width, height);
		return next;
	}

	/**
	 * Aumenta el viewBox actual sin tocar el contenido.
	 * @param {number|Object} value - Valor uniforme, o un objeto con { left, right, top, bottom }.
	 * @param {number} [vertical=value] - Si value es numérico, crecimiento para arriba y abajo.
	 * @param {number} [left=value] - Si se usan parámetros posicionales, crecimiento del lateral izquierdo.
	 * @param {number} [right=left] - Si se usan parámetros posicionales, crecimiento del lateral derecho.
	 * @param {number} [top=vertical] - Si se usan parámetros posicionales, crecimiento superior.
	 * @param {number} [bottom=top] - Si se usan parámetros posicionales, crecimiento inferior.
	 * @returns {SvgDocument} Nuevo documento SVG inmutable.
	 */
	growViewBox(value, vertical, left, right, top, bottom) {
		const viewBox = this.getViewBox();
		if (!viewBox) {
			return this.clone();
		}

		let deltas;
		if (value && typeof value === "object" && !Array.isArray(value)) {
			deltas = {
				left: Number(value.left ?? 0),
				right: Number(value.right ?? 0),
				top: Number(value.top ?? 0),
				bottom: Number(value.bottom ?? 0),
			};
		} else if (arguments.length === 1 || vertical === undefined) {
			const t = Number(value ?? 0);
			deltas = { left: t, right: t, top: t, bottom: t };
		} else if (arguments.length === 2) {
			const horizontal = Number(value ?? 0);
			const verticalValue = Number(vertical ?? 0);
			deltas = { left: horizontal, right: horizontal, top: verticalValue, bottom: verticalValue };
		} else {
			deltas = {
				left: Number(left ?? value ?? 0),
				right: Number(right ?? left ?? value ?? 0),
				top: Number(top ?? vertical ?? value ?? 0),
				bottom: Number(bottom ?? top ?? vertical ?? value ?? 0),
			};
		}

		const nextX = viewBox.x - deltas.left;
		const nextY = viewBox.y - deltas.top;
		const nextWidth = viewBox.width + deltas.left + deltas.right;
		const nextHeight = viewBox.height + deltas.top + deltas.bottom;

		return this.setViewBox(nextX, nextY, nextWidth, nextHeight).setSize(nextWidth, nextHeight);
	}

	moveToOrigin(padding = 0) {
		const bbox = this.getBoundingBox();
		const moved = this.translate(-bbox.x, -bbox.y);
		return moved.fitViewBoxToContent(padding);
	}

	clear() {
		const root = this._root.cloneNode(true);
		while (root.firstChild) {
			root.removeChild(root.firstChild);
		}
		return new SvgDocument(root);
	}

	static _coerceToSvgDocument(value) {
		if (value instanceof SvgDocument) return value;
		if (typeof value === "string") return SvgDocument.fromString(value);
		if (value instanceof SVGElement && value.tagName.toLowerCase() === "svg") {
			return SvgDocument.fromElement(value);
		}
		throw new Error("Expected SvgDocument, SVG element, or SVG string");
	}

	static _primitive(element, padding = 0, attrs = {}) {
		const doc = SvgDocument.create({ attrs: { overflow: "visible" } });
		const strokePadding = SvgDocument._strokePadding(attrs);
		return doc.addNode(element).fitViewBoxToContent(Math.max(0, padding, strokePadding));
	}

	_appendPrimitive(element, padding = 0) {
		const next = this.addNode(element);
		const currentBox = this.getBoundingBox();
		const nextBox = next.getBoundingBox();
		const minX = Math.min(currentBox.x, nextBox.x);
		const minY = Math.min(currentBox.y, nextBox.y);
		const maxX = Math.max(currentBox.x + currentBox.width, nextBox.x + nextBox.width);
		const maxY = Math.max(currentBox.y + currentBox.height, nextBox.y + nextBox.height);
		const p = Number.isFinite(padding) ? padding : 0;
		return next.setViewBox(minX - p, minY - p, (maxX - minX) + p * 2, (maxY - minY) + p * 2).setSize((maxX - minX) + p * 2, (maxY - minY) + p * 2);
	}

	static _strokePadding(attrs = {}) {
		const strokeWidth = attrs["stroke-width"] ?? attrs.strokeWidth ?? attrs.strokewidth;
		const numericStrokeWidth = Number(strokeWidth);
		return Number.isFinite(numericStrokeWidth) ? Math.max(0, numericStrokeWidth / 2) : 0;
	}

	static _normalizeViewBox(viewBox) {
		if (Array.isArray(viewBox) && viewBox.length === 4) {
			return `${viewBox[0]} ${viewBox[1]} ${viewBox[2]} ${viewBox[3]}`;
		}
		if (typeof viewBox === "string") {
			return viewBox;
		}
		if (viewBox && typeof viewBox === "object") {
			const { x = 0, y = 0, width = 0, height = 0 } = viewBox;
			return `${x} ${y} ${width} ${height}`;
		}
		throw new Error("Invalid viewBox value");
	}

	static _setAttributes(element, attrs = {}) {
		for (const [key, value] of Object.entries(attrs)) {
			if (value === null || value === undefined) {
				element.removeAttribute(key);
			} else {
				element.setAttribute(key, String(value));
			}
		}
	}
}
