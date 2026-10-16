import JSZip from 'jszip'
import { macroSeriesColors } from '../macro-chart'
import type { buildReportModel } from './model'

const chartNs = 'http://schemas.openxmlformats.org/drawingml/2006/chart'
const drawingNs = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const relNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const packageNs = 'http://schemas.openxmlformats.org/package/2006/relationships'

// ExcelJS does not write native charts. Add the chart parts to the newly created workbook.
// This function only accepts our generated workbook (Macrociclo is always sheet1).
export async function addMacroChart(buffer: Uint8Array, weeks: ReturnType<typeof buildReportModel>['weeks'], firstRow: number) {
  const zip = await JSZip.loadAsync(buffer)
  const series = [
    { name: 'Volumen planificado (%)', key: 'volumen' as const, column: 'F', color: macroSeriesColors.volumen.slice(1) },
    { name: 'Intensidad planificada (%)', key: 'intensidad' as const, column: 'G', color: macroSeriesColors.intensidad.slice(1) },
    { name: 'Forma deportiva estimada (%)', key: 'forma' as const, column: 'H', color: macroSeriesColors.forma.slice(1) },
  ].map((item, index) => `<c:ser><c:idx val="${index}"/><c:order val="${index}"/><c:tx><c:v>${item.name}</c:v></c:tx>
    ${index < 2 ? `<c:spPr><a:solidFill><a:srgbClr val="${item.color}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr>` : `<c:spPr><a:ln w="28575"><a:solidFill><a:srgbClr val="${item.color}"/></a:solidFill></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="5"/></c:marker>`}
    ${weeks.flatMap((week, i) => index === 2 && week.inMonth ? [`<c:dPt><c:idx val="${i}"/><c:marker><c:symbol val="circle"/><c:size val="7"/><c:spPr><a:solidFill><a:srgbClr val="${item.color}"/></a:solidFill></c:spPr></c:marker></c:dPt>`] : []).join('')}
    <c:cat><c:strRef><c:f>'Macrociclo'!$A$${firstRow}:$A$${firstRow + weeks.length - 1}</c:f><c:strCache><c:ptCount val="${weeks.length}"/>${weeks.map((w, i) => `<c:pt idx="${i}"><c:v>Semana ${w.semana}</c:v></c:pt>`).join('')}</c:strCache></c:strRef></c:cat>
    <c:val><c:numRef><c:f>'Macrociclo'!$${item.column}$${firstRow}:$${item.column}$${firstRow + weeks.length - 1}</c:f><c:numCache><c:formatCode>0</c:formatCode><c:ptCount val="${weeks.length}"/>${weeks.map((w, i) => `<c:pt idx="${i}"><c:v>${w.carga[item.key]}</c:v></c:pt>`).join('')}</c:numCache></c:numRef></c:val>${index === 2 ? '<c:smooth val="1"/>' : ''}</c:ser>`)
  zip.file('xl/charts/chart1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <c:chartSpace xmlns:c="${chartNs}" xmlns:a="${drawingNs}" xmlns:r="${relNs}"><c:lang val="es-CO"/><c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Macrociclo · cargas planificadas</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>
    <c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series.slice(0, 2).join('')}<c:gapWidth val="160"/><c:overlap val="0"/><c:axId val="1"/><c:axId val="2"/></c:barChart><c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${series[2]}<c:axId val="1"/><c:axId val="2"/></c:lineChart>
    <c:catAx><c:axId val="1"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:tickLblPos val="nextTo"/><c:crossAx val="2"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:tickLblSkip val="${Math.max(1, Math.ceil(weeks.length / 16))}"/></c:catAx>
    <c:valAx><c:axId val="2"/><c:scaling><c:orientation val="minMax"/><c:max val="100"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/><c:numFmt formatCode="0&quot;%&quot;" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="1"/><c:crosses val="autoZero"/><c:crossBetween val="between"/><c:majorUnit val="20"/></c:valAx>
    </c:plotArea><c:legend><c:legendPos val="b"/><c:layout/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`)
  zip.file('xl/drawings/drawing1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="${drawingNs}">
    <xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>7</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>9</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>26</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Macrociclo"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${chartNs}"><c:chart xmlns:c="${chartNs}" xmlns:r="${relNs}" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`)
  zip.file('xl/drawings/_rels/drawing1.xml.rels', `<Relationships xmlns="${packageNs}"><Relationship Id="rId1" Type="${relNs}/chart" Target="../charts/chart1.xml"/></Relationships>`)
  const sheetPath = 'xl/worksheets/sheet1.xml'
  const sheet = await zip.file(sheetPath)!.async('string')
  zip.file(sheetPath, sheet.replace('</worksheet>', '<drawing r:id="rIdMacroChart"/></worksheet>'))
  const relPath = 'xl/worksheets/_rels/sheet1.xml.rels'
  const rels = await zip.file(relPath)?.async('string') || `<Relationships xmlns="${packageNs}"></Relationships>`
  zip.file(relPath, rels.replace('</Relationships>', `<Relationship Id="rIdMacroChart" Type="${relNs}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`))
  const types = await zip.file('[Content_Types].xml')!.async('string')
  zip.file('[Content_Types].xml', types.replace('</Types>', '<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>'))
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
}
