
import React, { useState } from 'react';

interface FAQItem {
  question: string;
  questionEs: string;
  answer: string;
  answerEs: string;
  category: string;
}

interface FAQProps {
  language: 'en' | 'es';
}

const FAQ: React.FC<FAQProps> = ({ language }) => {
  const [openItem, setOpenItem] = useState<number | null>(null);

  const faqItems: FAQItem[] = [
    {
      question: "What is AI music mixing and how does it work?",
      questionEs: "¿Qué es la mezcla musical con IA y cómo funciona?",
      answer: "AI music mixing uses advanced algorithms trained on thousands of professional mixes to automatically balance, EQ, compress, and enhance your audio stems. Our AI analyzes each element of your song and applies industry-standard mixing techniques in minutes.",
      answerEs: "La mezcla musical con IA utiliza algoritmos avanzados entrenados con miles de mezclas profesionales para equilibrar, ecualizar, comprimir y mejorar automáticamente tus stems de audio. Nuestra IA analiza cada elemento de tu canción y aplica técnicas de mezcla estándar de la industria en minutos.",
      category: "mixing"
    },
    {
      question: "How many stems can I upload per project?",
      questionEs: "¿Cuántos stems puedo subir por proyecto?",
      answer: "You can upload up to 12 stems per project. This includes individual tracks like vocals, drums, bass, guitars, keyboards, and any other instruments or elements in your song.",
      answerEs: "Puedes subir hasta 12 stems por proyecto. Esto incluye pistas individuales como voces, batería, bajo, guitarras, teclados y cualquier otro instrumento o elemento en tu canción.",
      category: "technical"
    },
    {
      question: "What audio formats do you support?",
      questionEs: "¿Qué formatos de audio soportan?",
      answer: "We support MP3, WAV, FLAC, and AIFF formats. For best results, we recommend uploading high-quality WAV or FLAC files at 24-bit/48kHz or higher.",
      answerEs: "Soportamos formatos MP3, WAV, FLAC y AIFF. Para mejores resultados, recomendamos subir archivos WAV o FLAC de alta calidad a 24-bit/48kHz o superior.",
      category: "technical"
    },
    {
      question: "How do I get 500 free credits?",
      questionEs: "¿Cómo obtengo 500 créditos gratis?",
      answer: "Simply create a free account and you'll automatically receive 500 credits to start mixing your music. No payment required - just sign up and start creating professional mixes immediately.",
      answerEs: "Simplemente crea una cuenta gratuita y automáticamente recibirás 500 créditos para comenzar a mezclar tu música. No se requiere pago - solo regístrate y comienza a crear mezclas profesionales inmediatamente.",
      category: "credits"
    },
    {
      question: "How much does each mix cost in credits?",
      questionEs: "¿Cuánto cuesta cada mezcla en créditos?",
      answer: "The cost depends on the complexity and length of your project. Typical mixes range from 50-200 credits. Your 500 free credits allow you to mix multiple songs and test our service quality.",
      answerEs: "El costo depende de la complejidad y duración de tu proyecto. Las mezclas típicas van de 50-200 créditos. Tus 500 créditos gratis te permiten mezclar múltiples canciones y probar la calidad de nuestro servicio.",
      category: "credits"
    },
    {
      question: "Can I adjust the AI mix settings?",
      questionEs: "¿Puedo ajustar la configuración de la mezcla con IA?",
      answer: "Yes! Our AI provides intelligent suggestions, but you have complete control. You can adjust EQ, compression, reverb, and other parameters to match your artistic vision.",
      answerEs: "¡Sí! Nuestra IA proporciona sugerencias inteligentes, pero tienes control completo. Puedes ajustar EQ, compresión, reverb y otros parámetros para que coincidan con tu visión artística.",
      category: "mixing"
    },
    {
      question: "How long does it take to mix a song?",
      questionEs: "¿Cuánto tiempo toma mezclar una canción?",
      answer: "Our AI can process and mix your song in just 3-5 minutes, depending on the number of stems and complexity. This is dramatically faster than traditional mixing which can take hours or days.",
      answerEs: "Nuestra IA puede procesar y mezclar tu canción en solo 3-5 minutos, dependiendo del número de stems y complejidad. Esto es dramáticamente más rápido que la mezcla tradicional que puede tomar horas o días.",
      category: "technical"
    },
    {
      question: "Is the quality comparable to professional mixing?",
      questionEs: "¿La calidad es comparable a la mezcla profesional?",
      answer: "Yes! Our AI is trained on professional mixes from top studios worldwide. Users consistently report studio-quality results that are ready for streaming platforms like Spotify, Apple Music, and YouTube.",
      answerEs: "¡Sí! Nuestra IA está entrenada con mezclas profesionales de los mejores estudios mundiales. Los usuarios reportan consistentemente resultados de calidad de estudio que están listos para plataformas de streaming como Spotify, Apple Music y YouTube.",
      category: "quality"
    },
    {
      question: "Can I download my mixed tracks?",
      questionEs: "¿Puedo descargar mis pistas mezcladas?",
      answer: "Absolutely! Once your mix is complete, you can download high-quality WAV and MP3 files. The downloads include the full stereo mix optimized for streaming and professional use.",
      answerEs: "¡Absolutamente! Una vez que tu mezcla esté completa, puedes descargar archivos WAV y MP3 de alta calidad. Las descargas incluyen la mezcla estéreo completa optimizada para streaming y uso profesional.",
      category: "technical"
    },
    {
      question: "Do you offer different mixing styles?",
      questionEs: "¿Ofrecen diferentes estilos de mezcla?",
      answer: "Yes! We offer various mixing presets including Pop, Rock, Hip-Hop, Electronic, Acoustic, and more. Each preset applies genre-specific processing techniques for optimal results.",
      answerEs: "¡Sí! Ofrecemos varios presets de mezcla incluyendo Pop, Rock, Hip-Hop, Electrónica, Acústica y más. Cada preset aplica técnicas de procesamiento específicas del género para resultados óptimos.",
      category: "mixing"
    },
    {
      question: "Is my music secure and private?",
      questionEs: "¿Mi música está segura y privada?",
      answer: "Yes, your music is completely secure. We use enterprise-grade encryption, your files are processed securely, and we never share or use your music for any other purpose. You retain full ownership of your work.",
      answerEs: "Sí, tu música está completamente segura. Usamos encriptación de nivel empresarial, tus archivos se procesan de forma segura, y nunca compartimos o usamos tu música para ningún otro propósito. Mantienes la propiedad completa de tu trabajo.",
      category: "security"
    },
    {
      question: "Can I use the mixed songs commercially?",
      questionEs: "¿Puedo usar las canciones mezcladas comercialmente?",
      answer: "Yes! Once you've paid for mixing credits and downloaded your tracks, you have full commercial rights to use, distribute, and monetize your mixed music on any platform or medium.",
      answerEs: "¡Sí! Una vez que hayas pagado por los créditos de mezcla y descargado tus pistas, tienes derechos comerciales completos para usar, distribuir y monetizar tu música mezclada en cualquier plataforma o medio.",
      category: "legal"
    }
  ];

  const toggleItem = (index: number) => {
    setOpenItem(openItem === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          {language === 'en' ? 'Frequently Asked Questions' : 'Preguntas Frecuentes'}
        </h2>
        <p className="text-xl text-gray-600">
          {language === 'en' 
            ? 'Everything you need to know about AI music mixing'
            : 'Todo lo que necesitas saber sobre la mezcla musical con IA'}
        </p>
      </div>

      <div className="space-y-4">
        {faqItems.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full px-6 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-lg font-semibold text-gray-900 pr-4">
                {language === 'en' ? item.question : item.questionEs}
              </h3>
              <div className={`w-6 h-6 flex items-center justify-center text-purple-600 transition-transform ${
                openItem === index ? 'rotate-180' : ''
              }`}>
                <i className="ri-arrow-down-s-line text-xl"></i>
              </div>
            </button>
            
            {openItem === index && (
              <div className="px-6 pb-6">
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-gray-700 leading-relaxed">
                    {language === 'en' ? item.answer : item.answerEs}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CTA after FAQ */}
      <div className="text-center mt-12 p-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          {language === 'en' ? 'Ready to Try AI Music Mixing?' : '¿Listo para Probar la Mezcla Musical con IA?'}
        </h3>
        <p className="text-gray-600 mb-6">
          {language === 'en'
            ? 'Get 500 free credits and start mixing your music professionally today.'
            : 'Obtén 500 créditos gratis y comienza a mezclar tu música profesionalmente hoy.'}
        </p>
        <button
          onClick={()=>{window.location.href="/auth/register";}}
          className="inline-flex items-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
          style={{border:'none',cursor:'pointer',fontFamily:'inherit'}}
        >
          <i className="ri-music-2-line mr-2"></i>
          {language === 'en' ? 'Start Free Now' : 'Comenzar Gratis Ahora'}
        </button>
      </div>
    </div>
  );
};

export default FAQ;
