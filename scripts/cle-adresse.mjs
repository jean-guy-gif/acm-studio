// Mission 98 — la clé d'une adresse, telle que la liste « Ne plus solliciter » la range
// (`prospecting_oppositions.address_key`). La procédure d'effacement s'en sert pour inscrire une
// adresse sur la liste sans passer par l'écran :
//
//   npm run cle-adresse -- "8 avenue du Docteur Hochet, 06160 Antibes"
//
// Une seule normalisation pour tout l'outil : ce script charge celle de l'application, il n'en
// réécrit aucune. Node lit le fichier TypeScript tel quel (il n'a aucun import).
import { addressKey } from '../src/features/prospecting/services/address-key.ts';

const addresses = process.argv.slice(2);
if (addresses.length === 0) {
  console.error('Usage : npm run cle-adresse -- "<adresse>" ["<adresse>" …]');
  process.exit(1);
}
for (const address of addresses) {
  const key = addressKey(address);
  if (key == null) {
    console.error(`Adresse vide ou illisible : « ${address} »`);
    process.exit(1);
  }
  console.log(key);
}
