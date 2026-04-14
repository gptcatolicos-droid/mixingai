import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  const ff = "'Outfit',system-ui,sans-serif";
  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0D0A14,#1a0a2e)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:ff,color:'#F8F0FF',textAlign:'center',padding:'20px'}}>
      <div style={{fontSize:'80px',fontWeight:900,background:'linear-gradient(135deg,#EC4899,#C026D3)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',lineHeight:1,marginBottom:'16px'}}>404</div>
      <h1 style={{fontSize:'24px',fontWeight:700,color:'#F8F0FF',marginBottom:'10px'}}>Página no encontrada</h1>
      <p style={{fontSize:'15px',color:'rgba(155,126,200,0.7)',marginBottom:'32px',maxWidth:'400px',lineHeight:1.6}}>
        La página que buscas no existe o fue movida.
      </p>
      <button
        onClick={()=>navigate('/')}
        style={{background:'linear-gradient(135deg,#EC4899,#C026D3)',border:'none',color:'#fff',padding:'14px 32px',borderRadius:'980px',fontSize:'15px',fontWeight:700,cursor:'pointer',fontFamily:ff,boxShadow:'0 0 24px rgba(192,38,211,0.4)'}}>
        🏠 Volver al inicio
      </button>
    </div>
  );
}
