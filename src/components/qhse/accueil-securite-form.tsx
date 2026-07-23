"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completerAccueilSecurite } from "@/lib/server-actions/qhse-accueil-securite";
import { useNotifier } from "@/hooks/use-notifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/components/ui/composed/form-field";
import { CheckboxListe } from "@/components/qhse/checkbox-liste";

const EPI_RECUS = [
  "Casque de chantier",
  "Chaussures de sécurité",
  "Bottes de sécurité",
  "Vêtements de travail",
  "Gilet rétro-réfléchissant",
  "Lunettes de protection",
  "Gants de protection",
  "Protecteur antibruit",
  "Protection respiratoire",
  "Protection antichute",
];

const INFORMATIONS_FORMATIONS = [
  "Horaires de travail",
  "Organisation du service/équipe",
  "Locaux sociaux",
  "Règles de l'entreprise",
  "Politique Q-SST",
  "Dangers & risques Q-SST",
  "Consignes particulières du site",
  "Accès et issues de secours",
  "Conduite à tenir en cas d'accident",
  "Poste de travail et conditions d'exécution",
  "Dispositifs de protection collective",
  "Utilisation des EPI",
  "Risque routier & circulation",
  "Manutention manuelle & mécanique",
  "Droit de retrait en cas de risques",
  "Contribution à l'efficacité du SMQ-SST",
  "Répercussions du non-respect des exigences SMQ-SST",
];

const SENSIBILISATIONS_CONDUITES = [
  "Circulation et stationnement sur le site",
  "En cas d'incendie",
  "En cas d'accident (procédure de déclaration)",
  "En cas d'événement indésirable",
  "Accès au poste de travail",
];

interface AccueilSecuriteFormProps {
  accueilId: string;
}

export function AccueilSecuriteForm({ accueilId }: AccueilSecuriteFormProps) {
  const router = useRouter();
  const notifier = useNotifier();
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const [age, setAge] = useState("");
  const [statutTravailleur, setStatutTravailleur] = useState<"PERMANENT" | "OCCASIONNEL" | "VISITEUR">(
    "PERMANENT",
  );
  const [contactsTelephone, setContactsTelephone] = useState("");
  const [lieuHabitation, setLieuHabitation] = useState("");
  const [personneContactUrgenceNom, setPersonneContactUrgenceNom] = useState("");
  const [personneContactUrgenceTelephone, setPersonneContactUrgenceTelephone] = useState("");
  const [epiRecus, setEpiRecus] = useState<string[]>([]);
  const [autresEquipements, setAutresEquipements] = useState("");
  const [informationsFormationsRecues, setInformationsFormationsRecues] = useState<string[]>([]);
  const [sensibilisationsConduites, setSensibilisationsConduites] = useState<string[]>([]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErreur(null);
    setEnCours(true);

    const resultat = await completerAccueilSecurite(accueilId, {
      age: age ? Number(age) : undefined,
      statutTravailleur,
      contactsTelephone,
      lieuHabitation,
      personneContactUrgenceNom,
      personneContactUrgenceTelephone,
      epiRecus,
      autresEquipements,
      informationsFormationsRecues,
      sensibilisationsConduites,
    });

    setEnCours(false);
    if ("erreur" in resultat) {
      setErreur(resultat.erreur);
      return;
    }

    notifier.succes("Accueil Sécurité complété");
    router.push("/dashboard/qhse/accueil-securite");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Âge" htmlFor="age">
          <Input id="age" type="number" min={0} value={age} onChange={(e) => setAge(e.target.value)} />
        </FormField>
        <FormField label="Statut" htmlFor="statutTravailleur">
          <NativeSelect
            id="statutTravailleur"
            value={statutTravailleur}
            onChange={(e) => setStatutTravailleur(e.target.value as typeof statutTravailleur)}
          >
            <option value="PERMANENT">Permanent</option>
            <option value="OCCASIONNEL">Occasionnel</option>
            <option value="VISITEUR">Visiteur</option>
          </NativeSelect>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Téléphone" htmlFor="contactsTelephone">
          <Input
            id="contactsTelephone"
            value={contactsTelephone}
            onChange={(e) => setContactsTelephone(e.target.value)}
          />
        </FormField>
        <FormField label="Lieu d'habitation" htmlFor="lieuHabitation">
          <Input id="lieuHabitation" value={lieuHabitation} onChange={(e) => setLieuHabitation(e.target.value)} />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Personne à contacter en urgence — Nom" htmlFor="personneContactUrgenceNom">
          <Input
            id="personneContactUrgenceNom"
            value={personneContactUrgenceNom}
            onChange={(e) => setPersonneContactUrgenceNom(e.target.value)}
          />
        </FormField>
        <FormField label="Téléphone d'urgence" htmlFor="personneContactUrgenceTelephone">
          <Input
            id="personneContactUrgenceTelephone"
            value={personneContactUrgenceTelephone}
            onChange={(e) => setPersonneContactUrgenceTelephone(e.target.value)}
          />
        </FormField>
      </div>

      <CheckboxListe label="EPI reçus" options={EPI_RECUS} values={epiRecus} onChange={setEpiRecus} />
      <FormField label="Autres équipements" htmlFor="autresEquipements">
        <Input id="autresEquipements" value={autresEquipements} onChange={(e) => setAutresEquipements(e.target.value)} />
      </FormField>

      <CheckboxListe
        label="Informations & formations reçues"
        options={INFORMATIONS_FORMATIONS}
        values={informationsFormationsRecues}
        onChange={setInformationsFormationsRecues}
      />

      <CheckboxListe
        label="Sensibilisations & conduites à tenir"
        options={SENSIBILISATIONS_CONDUITES}
        values={sensibilisationsConduites}
        onChange={setSensibilisationsConduites}
      />

      {erreur && <p className="text-sm text-status-danger">{erreur}</p>}

      <Button type="submit" disabled={enCours} className="self-start">
        {enCours ? "Enregistrement..." : "Compléter et signer"}
      </Button>
    </form>
  );
}
