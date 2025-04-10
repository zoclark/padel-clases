// src/pages/Landing.jsx
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimation,
  useInView
} from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import Header from "@/components/Header";

import whatsappIcon from "@/assets/social/whatsapp.png";
import instagramIcon from "@/assets/social/instagram.png";

// Tus slides con zoom en CADA cambio de slide
import slide1 from "@/assets/slide1.png";
import slide2 from "@/assets/slide2.png";
import slide3 from "@/assets/slide3.png";

const slides = [
  { image: slide1, text: "Control personalizado del progreso del alumno" },
  { image: slide2, text: "Entrenamiento técnico y estratégico con análisis detallado" },
  { image: slide3, text: "Tecnología aplicada y biomecánica para maximizar el rendimiento" },
];

// Componente fade al hacer scroll
const FadeSection = ({ children }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, threshold: 0.2 });
  const controls = useAnimation();

  useEffect(() => {
    if (inView) {
      controls.start({ opacity: 1, y: 0 });
    }
  }, [inView, controls]);

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={controls}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="px-6 py-16 bg-gray-100 space-y-12"
    >
      {children}
    </motion.section>
  );
};

const testData = [
  { name: "Disléxico anónimo", text: "Me enfrento a Tapia de tú a tú. ¡Qué locura!" },
  { name: "Spiderman", text: "Ahora salto pared-fondo y remato desde mi casa." },
  { name: "Rubén", text: "Mis alumnos son unos flipaos." },
];

export default function Landing() {
  // Slide actual
  const [current, setCurrent] = useState(0);

  // Escala para cada slide (Efecto de Zoom)
  // Cuando current cambie, forzamos scale = 1.1 -> 1
  const [slideScale, setSlideScale] = useState(1);

  const handleSlideChange = (index) => {
    // Al cambiar de slide, reiniciamos la escala a 1.1, luego la llevamos a 1
    setSlideScale(1.1);
    setTimeout(() => {
      setSlideScale(1);
    }, 50);
    setCurrent(index);
  };

  const nextSlide = () => {
    let next = current + 1;
    if (next >= slides.length) next = 0;
    handleSlideChange(next);
  };

  const prevSlide = () => {
    let prev = current - 1;
    if (prev < 0) prev = slides.length - 1;
    handleSlideChange(prev);
  };

  // Scroll a la sección info
  const infoRef = useRef(null);
  const scrollToInfo = () => {
    infoRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Footer expandible
  const [footerPadding, setFooterPadding] = useState(16);
  const revealRef = useRef(null);
  const inViewReveal = useInView(revealRef, { threshold: 0.3 });

  useEffect(() => {
    if (inViewReveal) {
      setFooterPadding(40);
    } else {
      setFooterPadding(16);
    }
  }, [inViewReveal]);

  return (
    <div className="min-h-screen flex flex-col bg-white scroll-smooth relative">
      <Header />

      {/* Sección principal con slides, con scale para cada slide */}
      <section className="relative h-screen w-full overflow-hidden pt-20">
        {slides.map((slide, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: current === index ? 1 : 0 }}
            transition={{ duration: 0.6 }}
            className={`absolute inset-0 w-full h-full ${current === index ? 'z-10' : 'z-0'}`}
          >
            <motion.div
              // Efecto zoom para la imagen
              animate={{ scale: current === index ? slideScale : 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
            <div className="absolute inset-0 bg-black/50 flex flex-col justify-center items-center text-white text-center px-4">
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg"
              >
                {slide.text}
              </motion.h1>
              <Button
                onClick={scrollToInfo}
                className="mt-6 px-6 py-3 bg-blue-600 text-white font-semibold hover:bg-blue-700"
              >
                Más información
              </Button>
            </div>
          </motion.div>
        ))}

        {/* Flechas del carrusel */}
        <button
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white z-20"
          onClick={prevSlide}
        >
          <ChevronLeft size={28} />
        </button>
        <button
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white z-20"
          onClick={nextSlide}
        >
          <ChevronRight size={28} />
        </button>

        {/* Indicador de scroll */}
        <motion.div
          className="absolute bottom-6 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <ChevronDown size={32} className="text-white opacity-80" />
        </motion.div>
      </section>

      {/* Panel informativo */}
      <FadeSection>
        <div ref={infoRef} id="sobre" className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Entrena con visión y tecnología</h2>
          <p className="text-lg text-gray-700">
            Nuestro enfoque combina biomecánica, análisis técnico y progresión personalizada para cada jugador.
            Visualiza tu evolución, accede a estadísticas y entrena como los profesionales.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <h3 className="font-semibold text-xl mb-2">Progreso personalizado</h3>
            <p className="text-gray-600">Cada sesión se analiza para medir tus mejoras reales y objetivas.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <h3 className="font-semibold text-xl mb-2">Clases a medida</h3>
            <p className="text-gray-600">Individuales, en pareja o grupos reducidos, siempre personalizadas.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <h3 className="font-semibold text-xl mb-2">Tecnología avanzada</h3>
            <p className="text-gray-600">Grabaciones, sensores y biomecánica para maximizar tu rendimiento.</p>
          </div>
        </div>
      </FadeSection>

      {/* Sección intermedia */}
      <FadeSection>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Más que una academia</h2>
          <p className="text-gray-700">
            Nos implicamos en tu evolución real. Aquí no vienes a hacer ejercicios al azar, vienes a mejorar.
          </p>
        </div>
      </FadeSection>

      {/* Testimonios */}
      <FadeSection>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Lo que dicen nuestros alumnos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testData.map(({ name, text }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.2 }}
                className="bg-white p-6 rounded-lg shadow"
              >
                <p className="text-gray-600 italic">“{text}”</p>
                <p className="mt-4 font-semibold text-blue-700">{name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </FadeSection>

      {/* Sección final para reveal footer */}
      <FadeSection>
        <div
          id="contacto"
          ref={revealRef}
          className="max-w-4xl mx-auto text-center bg-white py-16"
        >
          <h2 className="text-2xl font-bold mb-3">Contáctanos</h2>
          <p className="text-gray-700 mb-6">
            ¿Tienes dudas o quieres más información? Escríbenos por WhatsApp o redes sociales.
          </p>
          <Button
            onClick={() => window.open("https://wa.me/34612345678", "_blank")}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            Hablar por WhatsApp
          </Button>
        </div>
      </FadeSection>

      {/* Enlaces flotantes */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        {/* WhatsApp */}
        <a
          href="https://wa.me/34652069367"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full shadow-lg"
        >
          <img src={whatsappIcon} alt="WhatsApp" className="w-full h-full object-contain" />
        </a>
        {/* Instagram */}
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-16 h-16 bg-pink-600 hover:bg-pink-700 rounded-full shadow-lg"
        >
          <img src={instagramIcon} alt="Instagram" className="w-full h-full object-contain" />
        </a>
      </div>

      {/* Footer expandible */}
      <motion.footer
        animate={{ paddingTop: footerPadding, paddingBottom: footerPadding }}
        transition={{ duration: 0.5 }}
        className="bg-blue-700 text-white text-center"
      >
        <p>&copy; {new Date().getFullYear()} PadelPro. Todos los derechos reservados.</p>
      </motion.footer>
    </div>
  );
}
