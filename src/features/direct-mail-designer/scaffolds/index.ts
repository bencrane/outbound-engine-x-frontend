import type { Scaffold } from "../types";

import postcard4x6 from "./postcard-4x6.json";
import postcard5x7 from "./postcard-5x7.json";
import postcard6x9 from "./postcard-6x9.json";
import postcard6x11 from "./postcard-6x11.json";
import letter8_5x11 from "./letter-8.5x11.json";
import letter8_5x14 from "./letter-8.5x14.json";
import selfmailer6x18Bifold from "./selfmailer-6x18-bifold.json";
import selfmailer12x9Bifold from "./selfmailer-12x9-bifold.json";
import selfmailer11x9Bifold from "./selfmailer-11x9-bifold.json";
import selfmailer17_75x9Trifold from "./selfmailer-17.75x9-trifold.json";
import snappack8_5x11 from "./snappack-8.5x11.json";
import booklet8_375x5_375 from "./booklet-8.375x5.375.json";
import buckslip from "./buckslip.json";
import cardAffix from "./card-affix.json";

/** All scaffolds, ordered by format category */
export const ALL_SCAFFOLDS: Scaffold[] = [
  postcard4x6,
  postcard5x7,
  postcard6x9,
  postcard6x11,
  letter8_5x11,
  letter8_5x14,
  selfmailer6x18Bifold,
  selfmailer12x9Bifold,
  selfmailer11x9Bifold,
  selfmailer17_75x9Trifold,
  snappack8_5x11,
  booklet8_375x5_375,
  buckslip,
  cardAffix,
] as Scaffold[];

/** Scaffolds that accept HTML (usable in the designer) */
export const HTML_SCAFFOLDS = ALL_SCAFFOLDS.filter((s) =>
  s.acceptedFormats.includes("html"),
);
