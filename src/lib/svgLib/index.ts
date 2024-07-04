/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Svg } from "@svgdotjs/svg.js";

/**
 * 將SVG元素的內容添加到繪圖區域
 * @param draw - 繪圖區域
 * @param svgElement - SVG元素
 * @param param2 - 參數
 * @param param2.lineWidth - 線條寬度
 */
export function loadSvgElementToDraw(draw: Svg, svgElement: SVGSVGElement, { lineWidth = 5 }: { lineWidth?: number }) {
    // 將SVG元素的內容添加到繪圖區域
    const svgChildren = Array.from(svgElement.children)
    svgChildren.forEach((child: any) => {
        if (child.tagName.toLowerCase() === 'polygon') {
            const points = child
                .getAttribute('points')
                .split(' ')
                .map((element: string) => {
                    return element.split(',').map((point) => parseFloat(point))
                })
            draw.polygon().plot(points).fill('none').stroke({ color: 'white', width: lineWidth })
        } else if (child.tagName.toLowerCase() === 'rect') {
            draw
                .rect(child.width.baseVal.value, child.height.baseVal.value)
                .move(child.x.baseVal.value, child.y.baseVal.value)
                .attr(getAttributes(child))
        } else if (child.tagName.toLowerCase() === 'line') {
            draw
                .line(
                    child.x1.baseVal.value,
                    child.y1.baseVal.value,
                    child.x2.baseVal.value,
                    child.y2.baseVal.value
                )
                .attr(getAttributes(child))
        } else if (child.tagName.toLowerCase() === 'path') {
            draw.path(child.getAttribute('d')).attr(getAttributes(child))
        }
    })
}

// 輔助函數：獲取元素的屬性
function getAttributes(element: any): { [key: string]: string } {
    const attrs: { [key: string]: string } = {}
    for (const attr of element.attributes) {
        if (
            attr.name !== 'width' &&
            attr.name !== 'height' &&
            attr.name !== 'x' &&
            attr.name !== 'y'
        ) {
            // 排除一些不需要的屬性
            attrs[attr.name] = attr.value
        }
    }
    return attrs
}