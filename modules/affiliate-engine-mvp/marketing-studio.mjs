/**
 * ARC Affiliate 1.5 — local organic-marketing draft workspace.
 *
 * All product proposals, prices, traffic, conversions and commissions are
 * DEMONSTRATIVE ONLY. This module has no publishing, checkout, payments,
 * affiliate payouts, real customer data, trackers or external API calls.
 *
 * Reuses the pre-existing SQLite DemoAffiliateEngine, never MySQL R4.
 */
import {randomUUID} from 'node:crypto';

const KINDS=new Set(['DIGITAL_GUIDE','REMOTE_ADVICE']);
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WARNING='BORRADOR DEMOSTRATIVO: contenido no terminado; no se aceptan compras ni pagos.';
const MAX_INT=1_000_000_000;

function txt(value,label,min,max){
  if(typeof value!=='string')throw new Error(label+': texto obligatorio');
  const cleaned=value.trim().replace(/\s+/g,' ');
  if(cleaned.length<min||cleaned.length>max||/[<>]/.test(cleaned)){
    throw new Error(label+': longitud o formato no permitido');
  }
  return cleaned;
}
function validated(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Página comercial inválida');
  const productId=txt(input.productId,'producto',3,100);
  const slug=txt(input.slug,'slug',3,60);
  if(!SLUG.test(slug))throw new Error('Slug: solo minúsculas, números y guiones');
  const kind=input.kind;
  if(!KINDS.has(kind))throw new Error('Clase comercial inválida');
  const headline=txt(input.headline,'titular',12,140);
  const audience=txt(input.audience,'público',12,180);
  const summary=txt(input.summary,'descripción',30,480);
  if(!Array.isArray(input.highlights)||input.highlights.length<2||input.highlights.length>5){
    throw new Error('Se requieren de 2 a 5 puntos de contenido');
  }
  const highlights=input.highlights.map(v=>txt(v,'punto comercial',12,160));
  if(!Number.isInteger(input.expectedRevision)||input.expectedRevision<0||
     input.expectedRevision>MAX_INT)throw new Error('Revisión editorial inválida');
  return {productId,slug,kind,headline,audience,summary,highlights,
    expectedRevision:input.expectedRevision};
}

export const SAMPLE_DRAFTS=Object.freeze([
 Object.freeze({
  slug:'guia-diagnostico-neveras-no-frost',kind:'DIGITAL_GUIDE',
  title:'Guía No Frost: diagnóstico paso a paso',priceCop:49000,commissionPct:30,
  headline:'Diagnóstico estructurado de neveras No Frost para técnicos',
  audience:'Técnicos de refrigeración en formación y profesionales que quieren ordenar sus comprobaciones',
  summary:'Propuesta editorial de una guía digital sobre síntomas de enfriamiento, deshielo y ventilación, con un método de descarte antes del reemplazo de componentes.',
  highlights:Object.freeze([
   'Ruta inicial de comprobaciones para falta de enfriamiento',
   'Lecturas de sensores, ventiladores y componentes de deshielo',
   'Lista de verificación para documentar cada reparación'
  ])
 }),
 Object.freeze({
  slug:'guia-diagnostico-lavadoras',kind:'DIGITAL_GUIDE',
  title:'Guía de lavadoras: sensores y fallas de giro',priceCop:39000,commissionPct:30,
  headline:'Fallas de giro y sensores en lavadoras: guía para diagnosticar',
  audience:'Técnicos en formación y reparadores que necesitan un orden lógico de revisión',
  summary:'Borrador de una guía digital centrada en causas de no giro, errores de llenado y comprobaciones eléctricas seguras antes de intervenir una tarjeta electrónica.',
  highlights:Object.freeze([
   'Secuencia de diagnóstico para lavadoras que no giran',
   'Comprobaciones de presostato, sensores y cableado',
   'Registro de fallas, decisiones y confirmación de reparación'
  ])
 }),
 Object.freeze({
  slug:'asesoria-remota-diagnostico',kind:'REMOTE_ADVICE',
  title:'Asesoría remota de diagnóstico técnico',priceCop:79000,commissionPct:20,
  headline:'Orientación remota para organizar el diagnóstico de una falla',
  audience:'Técnicos que necesitan una segunda opinión profesional y revisión de mediciones',
  summary:'Propuesta de servicio bajo agenda y disponibilidad por confirmar. Se revisarán síntomas y comprobaciones documentadas; no promete reparación ni sustituye una visita presencial.',
  highlights:Object.freeze([
   'Revisión guiada de síntomas, fotografías y mediciones',
   'Plan de verificaciones con advertencias de seguridad',
   'Resumen de posibles causas y siguientes pasos'
  ])
 })
]);

export class DemoMarketingStudio {
  constructor(engine){
    if(!engine?.db||typeof engine.transaction!=='function'||
       typeof engine.log!=='function'||typeof engine.getReferral!=='function'){
      throw new Error('Se necesita el motor SQLite demostrativo');
    }
    this.engine=engine;
    this.db=engine.db;
    this.db.exec(\`
      CREATE TABLE IF NOT EXISTS marketing_drafts (
        product_id TEXT PRIMARY KEY REFERENCES products(id),
        slug TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL CHECK(kind IN ('DIGITAL_GUIDE','REMOTE_ADVICE')),
        headline TEXT NOT NULL,
        audience TEXT NOT NULL,
        summary TEXT NOT NULL,
        highlights_json TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>=1),
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    \`);
  }
  getCatalog(){
    const rows=this.db.prepare(\`
      SELECT p.id AS productId,p.title,p.price_cop AS priceCop,
        p.commission_pct AS commissionPct,
        m.slug,m.kind,m.headline,m.audience,m.summary,m.highlights_json AS highlightsJSON,
        m.revision,m.updated_at AS updatedAt
      FROM marketing_drafts m JOIN products p ON p.id=m.product_id
      ORDER BY p.rowid ASC
    \`).all();
    return rows.map(r=>{
      const {highlightsJSON,...page}=r;
      return {...page,highlights:JSON.parse(highlightsJSON),
        state:'DEMO_DRAFT',warning:WARNING,realProduct:false};
    });
  }
  getPageByProduct(productId){
    if(typeof productId!=='string'||productId.length>100)throw new Error('Producto inválido');
    return this.getCatalog().find(p=>p.productId===productId)||null;
  }
  getPageBySlug(slug){
    if(typeof slug!=='string'||!SLUG.test(slug)||slug.length>60)throw new Error('Slug inválido');
    return this.getCatalog().find(p=>p.slug===slug)||null;
  }
  saveDraft(input){
    const page=validated(input);
    const {expectedRevision,...values}=page;
    return this.engine.transaction(()=>{
      const product=this.db.prepare('SELECT id FROM products WHERE id=?').get(values.productId);
      if(!product)throw new Error('Producto inexistente');
      const before=this.db.prepare('SELECT revision FROM marketing_drafts WHERE product_id=?')
        .get(values.productId);
      if((before?.revision||0)!==expectedRevision)throw new Error('Conflicto de revisión: recarga la ficha');
      const revision=expectedRevision+1;
      const args=[
        values.productId,values.slug,values.kind,values.headline,values.audience,
        values.summary,JSON.stringify(values.highlights),revision
      ];
      if(before){
        this.db.prepare(\`
          UPDATE marketing_drafts SET slug=?,kind=?,headline=?,audience=?,
            summary=?,highlights_json=?,revision=?,updated_at=CURRENT_TIMESTAMP
          WHERE product_id=?\`).run(values.slug,values.kind,values.headline,
          values.audience,values.summary,JSON.stringify(values.highlights),revision,
          values.productId);
      }else{
        this.db.prepare(\`
          INSERT INTO marketing_drafts
            (product_id,slug,kind,headline,audience,summary,highlights_json,revision)
          VALUES (?,?,?,?,?,?,?,?)\`).run(...args);
      }
      this.engine.log('MARKETING_DRAFT_SAVED',values.productId,{
        slug:values.slug,kind:values.kind,revision
      });
      return this.getPageByProduct(values.productId);
    });
  }
  seedSampleDrafts(){
    const result=[];
    for(const template of SAMPLE_DRAFTS){
      const existing=this.getPageBySlug(template.slug);
      if(existing){result.push(existing);continue;}
      // Keep product and editorial page atomic; do not create duplicate offers
      // when the seeding button is pressed repeatedly.
      const inserted=this.engine.transaction(()=>{
        const id=randomUUID();
        this.db.prepare('INSERT INTO products(id,title,price_cop,commission_pct) VALUES(?,?,?,?)')
          .run(id,template.title,template.priceCop,template.commissionPct);
        this.db.prepare(\`
          INSERT INTO marketing_drafts
            (product_id,slug,kind,headline,audience,summary,highlights_json,revision)
          VALUES (?,?,?,?,?,?,?,1)
        \`).run(id,template.slug,template.kind,template.headline,template.audience,
          template.summary,JSON.stringify(template.highlights));
        this.engine.log('PRODUCT_CREATED',id,{
          title:template.title,priceCop:template.priceCop,commissionPct:template.commissionPct,
          simulationOnly:true
        });
        this.engine.log('MARKETING_DRAFT_SAVED',id,{
          slug:template.slug,revision:1,simulationOnly:true
        });
        return this.getPageByProduct(id);
      });
      result.push(inserted);
    }
    return result;
  }
  landingForReferral(token){
    const ref=this.engine.getReferral(token);
    if(!ref)return null;
    const page=this.getPageByProduct(ref.productId);
    if(!page)return null;
    return Object.freeze({
      token:ref.token,affiliateName:ref.affiliate,productName:ref.product,
      page,localPreviewPath:'/?ref='+ref.token,
      warning:WARNING,paymentsEnabled:false,publicLink:false
    });
  }
  promoText(token){
    const landing=this.landingForReferral(token);
    if(!landing)throw new Error('Enlace sin borrador de página');
    const p=landing.page;
    return Object.freeze({
      channel:'ORGANIC_DRAFT_ONLY',
      headline:p.headline,
      copy:[p.headline,p.summary,'Dirigido a: '+p.audience,
        'Incluye como propuesta: '+p.highlights.join('; '),
        'BORRADOR SIN COMPRA — La oferta y su contenido no están publicados.'].join('\n\n'),
      localPreviewPath:landing.localPreviewPath,
      publishable:false,paymentsEnabled:false
    });
  }
  overview(){
    const rows=this.db.prepare(\`
      SELECT l.token,l.product_id AS productId,l.affiliate_id AS affiliateId,
       p.title AS product,a.name AS affiliate,l.clicks,
       COALESCE(s.confirmed,0) AS simulatedOrders,
       COALESCE(s.refunded,0) AS simulatedRefunds,
       COALESCE(s.gross_cop,0) AS demoGrossCop,
       COALESCE(s.affiliate_cop,0) AS demoAffiliateCop,
       COALESCE(s.arc_cop,0) AS demoArcCop
      FROM referral_links l
      JOIN products p ON p.id=l.product_id JOIN affiliates a ON a.id=l.affiliate_id
      LEFT JOIN (
        SELECT referral_token,
          SUM(CASE WHEN status='DEMO_CONFIRMED' THEN 1 ELSE 0 END) AS confirmed,
          SUM(CASE WHEN status='DEMO_REFUNDED' THEN 1 ELSE 0 END) AS refunded,
          SUM(CASE WHEN status='DEMO_CONFIRMED' THEN price_cop ELSE 0 END) AS gross_cop,
          SUM(CASE WHEN status='DEMO_CONFIRMED' THEN affiliate_cop ELSE 0 END) AS affiliate_cop,
          SUM(CASE WHEN status='DEMO_CONFIRMED' THEN arc_cop ELSE 0 END) AS arc_cop
        FROM demo_sales WHERE referral_token IS NOT NULL
        GROUP BY referral_token
      ) s ON s.referral_token=l.token
      ORDER BY l.rowid DESC
    \`).all();
    const campaigns=rows.map(r=>({
      ...r,
      demoOrdersPer100Visits:r.clicks>0
        ?Math.round(10000*r.simulatedOrders/r.clicks)/100:null
    }));
    const totals=campaigns.reduce((a,c)=>{
      for(const k of ['clicks','simulatedOrders','simulatedRefunds',
        'demoGrossCop','demoAffiliateCop','demoArcCop'])a[k]+=c[k];
      return a;
    },{clicks:0,simulatedOrders:0,simulatedRefunds:0,
      demoGrossCop:0,demoAffiliateCop:0,demoArcCop:0});
    return Object.freeze({
      environment:'DEMO_ONLY',currency:'COP',campaigns,totals,
      disclaimer:'Eventos y cifras ficticios de una demo local. Las visitas no son clientes únicos; ventas, conversión, ingresos y comisiones no son reales.',
      actualSales:0,actualRevenueCop:0,
      realTrackingEnabled:false,paymentsEnabled:false,published:false
    });
  }
}
