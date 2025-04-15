import { useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimation,
  useInView,
} from "framer-motion";
import { Button } from "@/components/ui/Button";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import Header from "@/components/Header";

import whatsappIcon from "@/assets/social/whatsapp.png";
import instagramIcon from "@/assets/social/instagram.png";

import slide1 from "@/assets/slide1.png";
import slide2 from "@/assets/slide2.png";
import slide3 from "@/assets/slide3.png";

const slides = [
  { image: slide1, text: "Control personalizado del progreso del alumno" },
  { image: slide2, text: "Entrenamiento técnico y estratégico con análisis detallado" },
  { image: slide3, text: "Tecnología aplicada y biomecánica para maximizar el rendimiento" },
];

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
  const [current, setCurrent] = useState(0);
  const [slideScale, setSlideScale] = useState(1);

  const handleSlideChange = (index) => {
    setSlideScale(1.1);
    setTimeout(() => setSlideScale(1), 50);
    setCurrent(index);
  };

  const nextSlide = () => handleSlideChange((current + 1) % slides.length);
  const prevSlide = () => handleSlideChange((current - 1 + slides.length) % slides.length);

  const infoRef = useRef(null);
  const scrollToInfo = () => infoRef.current?.scrollIntoView({ behavior: "smooth" });

  const [footerPadding, setFooterPadding] = useState(16);
  const revealRef = useRef(null);
  const inViewReveal = useInView(revealRef, { threshold: 0.3 });

  useEffect(() => {
    setFooterPadding(inViewReveal ? 40 : 16);
  }, [inViewReveal]);

  return (
    <div className="min-h-screen flex flex-col bg-white scroll-smooth relative">
      <Header />

      <section className="relative h-screen w-full overflow-hidden pt-20">
        {slides.map((slide, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: current === index ? 1 : 0 }}
            transition={{ duration: 0.6 }}
            className={`absolute inset-0 w-full h-full ${current === index ? "z-10" : "z-0"}`}
          >
            <motion.div
              animate={{ scale: current === index ? slideScale : 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
            <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-4 pointer-events-none">
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="font-bold mb-4 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
                style={{ fontSize: "clamp(1.8rem, 5vw, 4rem)", maxWidth: "90%" }}
              >
                {slide.text}
              </motion.h1>
              <div className="pointer-events-auto">
                <Button
                  onClick={scrollToInfo}
                  variant="secondary"
                  className="group mt-4 px-6 py-3 font-semibold border border-gray-300 rounded shadow-md hover:bg-blue-600 hover:text-white transition-colors duration-300"
                >
                  <span className="relative z-10">Más información</span>
                </Button>
              </div>
            </div>
          </motion.div>
        ))}

        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20">
          <button
            onClick={prevSlide}
            className="bg-black/40 hover:bg-black/60 text-white rounded-full p-2 backdrop-blur-sm transition"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
          <button
            onClick={nextSlide}
            className="bg-black/40 hover:bg-black/60 text-white rounded-full p-2 backdrop-blur-sm transition"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <motion.div
          className="absolute bottom-6 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <ChevronDown size={32} className="text-white opacity-80" />
        </motion.div>
      </section>

      <FadeSection>
        <div ref={infoRef} id="sobre" className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Entrena con visión y tecnología</h2>
          <p className="text-lg text-gray-700">
            Nuestro enfoque combina biomecánica, análisis técnico y progresión personalizada para cada jugador.
            Visualiza tu evolución, accede a estadísticas y entrena como los profesionales.
          </p>
        </div>
      </FadeSection>

      <FadeSection>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">Más que una academia</h2>
          <p className="text-gray-700">
            Nos implicamos en tu evolución real. Aquí no vienes a hacer ejercicios al azar, vienes a mejorar.
          </p>
        </div>
      </FadeSection>

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

      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        <a
          href="https://wa.me/34652069367"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 rounded-full shadow-lg"
        >
          <img src={whatsappIcon} alt="WhatsApp" className="w-full h-full object-contain" />
        </a>
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-10 h-10 bg-pink-600 hover:bg-pink-700 rounded-full shadow-lg"
        >
          <img src={instagramIcon} alt="Instagram" className="w-full h-full object-contain" />
        </a>
      </div>

      <motion.footer
        animate={{ paddingTop: footerPadding, paddingBottom: footerPadding }}
        transition={{ duration: 0.5 }}
        className="bg-blue-700 text-white text-center"
      >
        <p>&copy; {new Date().getFullYear()} MetrikPadel. Todos los derechos reservados.</p>
      </motion.footer>
    </div>
  );
}