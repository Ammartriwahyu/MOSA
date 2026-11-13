// Dimuat terpisah (dynamic import) oleh MotionProvider agar fitur animasi tidak
// membebani muat awal; elemen `m.*` tetap tampil sebelum fitur siap.
import { domAnimation } from "motion/react";

export default domAnimation;
