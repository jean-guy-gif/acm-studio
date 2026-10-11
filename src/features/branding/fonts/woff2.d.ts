// Un fichier de police importé donne l'adresse sous laquelle le build le sert.
declare module '*.woff2' {
  const src: string;
  export default src;
}
