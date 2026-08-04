import { Link } from 'react-router-dom';
import './terms-v3.css';

const sections = [
  ['1. Servicio', 'MixingMusic.AI permite crear mezclas desde stems, mejorar premezclas y masterizar canciones o álbumes mediante procesamiento automatizado y presets propios. Los resultados dependen de la calidad y características del audio cargado; no garantizamos un resultado artístico específico.'],
  ['2. Cuenta y seguridad', 'Debes proporcionar información correcta y proteger tus credenciales. Eres responsable de la actividad realizada con tu cuenta. Podemos limitar accesos que presenten fraude, automatización abusiva o vulneración de estos términos.'],
  ['3. Modalidad Gratis', 'Incluye hasta 3 mezclas creadas desde stems y 1 master descargable en MP3. El acceso gratuito puede requerir registro y está sujeto a controles razonables para evitar cuentas duplicadas o abuso.'],
  ['4. Unlimited para siempre', 'Unlimited cuesta US$14.99 como precio fundador y se adquiere mediante un solo pago. No es una suscripción, no tiene mensualidades ni renovación automática. Incluye mezclas y masters ilimitados, WAV PCM de 24 bits, configuraciones guardadas y modo álbum de hasta 12 canciones, sujeto a uso razonable y disponibilidad técnica.'],
  ['5. Pagos con PayPal', 'Los pagos se procesan de forma segura por PayPal. MixingMusic.AI no almacena los datos completos de tu tarjeta. Unlimited se activa únicamente cuando PayPal confirma y captura correctamente el pago. Los impuestos, conversión de moneda o cargos bancarios externos pueden variar según el país.'],
  ['6. Reembolsos', 'Si existe un cobro duplicado o una falla que impida activar Unlimited después de un pago confirmado, contáctanos con el número de orden de PayPal. Evaluaremos cada solicitud conforme a la evidencia del pago y la legislación aplicable. No se garantiza reembolso por preferencias artísticas después de usar o descargar resultados.'],
  ['7. Tus archivos y derechos', 'Conservas los derechos sobre el audio que cargas. Declaras que cuentas con autorización para procesarlo. Otorgas una licencia técnica, limitada y temporal para analizar, transformar y entregar los resultados solicitados. No vendemos la propiedad de tu música.'],
  ['8. Uso permitido', 'No puedes cargar material ilegal, vulnerar derechos de terceros, intentar acceder a cuentas o infraestructura ajena, revender el servicio como propio ni usar automatizaciones que degraden la plataforma.'],
  ['9. Disponibilidad y límites', 'Podemos realizar mantenimiento, actualizar motores y aplicar límites técnicos de uso razonable para proteger la plataforma. “Ilimitado” significa que no cobramos por canción dentro del uso normal de una persona o estudio; no autoriza procesamiento automatizado masivo, reventa o uso como API no contratada.'],
  ['10. Responsabilidad', 'Debes escuchar y aprobar cada resultado antes de distribuirlo. MixingMusic.AI no responde por pérdidas indirectas, decisiones de publicación, rechazos de plataformas, daños derivados de archivos originales defectuosos o usos no autorizados.'],
  ['11. Cambios y contacto', 'Podemos actualizar estas condiciones cuando cambien el servicio o la normativa. La versión vigente se publicará aquí. Para pagos, privacidad o soporte puedes escribir a support@mixingmusic.ai.'],
];

export default function TermsPage() {
  return <main className="terms-v3-page"><nav><Link to="/"><img src="/logo-brand.png" alt="MixingMusic.AI" /><span>V3</span></Link><Link to="/pricing">Ver precios</Link></nav><header><span>TÉRMINOS Y CONDICIONES</span><h1>Reglas claras para crear,<strong>mezclar y masterizar.</strong></h1><p>Última actualización: 4 de agosto de 2026.</p></header><section>{sections.map(([title,text])=><article key={title}><h2>{title}</h2><p>{text}</p></article>)}</section><div className="terms-v3-links"><Link to="/privacy">Política de privacidad →</Link><Link to="/pricing">Comparar Gratis y Unlimited →</Link></div></main>;
}
