import { redirect } from 'next/navigation';

// Mission 130 B — « Biens idéaux » quitte le menu Acquéreur : la page refaisait la liste des
// acquéreurs ; chaque fiche mène à ses biens idéaux. Un ancien lien ramène aux acquéreurs.
export default function IdealPropertiesIndexPage(): never {
  redirect('/acquereurs');
}
