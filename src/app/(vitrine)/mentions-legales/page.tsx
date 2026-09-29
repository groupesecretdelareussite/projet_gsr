import type { Metadata } from "next";
import {
  Shield,
  FileText,
  Cookie,
  Lock,
  CheckCircle2,
  Building2,
  Server,
  Scale,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Mentions légales et politique de confidentialité | GSR",
  description:
    "Mentions légales et politique de confidentialité du Groupe Secret de la Réussite (GSR) à Cotonou, Bénin. Conformité au Code du numérique, protection des données personnelles des élèves et politique des cookies.",
  alternates: { canonical: "/mentions-legales" },
};

const IFU_OFFICIEL = "0 2019 1094 0473";
const CONTACT_EMAIL = "contact@groupe-secretdelareussite.com";
const PHONE_1 = "+229 01 96 08 40 67";
const PHONE_2 = "+229 01 49 76 16 35";

function Section({
  id,
  title,
  icon: Icon,
  children,
}: {
  id?: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 mb-10 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h2>
      </div>
      <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">{children}</div>
    </section>
  );
}

export default function MentionsLegalesPage() {
  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* Hero Header */}
      <div
        className="px-6 py-14 md:py-20 text-white"
        style={{ background: "linear-gradient(110deg, #05330f 20%, #0a5c10 60%, #12aa00 100%)" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-xs sm:text-sm font-medium mb-4 text-emerald-100">
            <Shield className="w-4 h-4" />
            Transparence & Conformité légale
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight">
            Mentions légales et politique de confidentialité
          </h1>
          <p className="text-white/90 text-sm sm:text-base max-w-2xl leading-relaxed">
            Informations juridiques, engagement de protection des données à caractère personnel conformément au Code du
            numérique en République du Bénin, et politique de gestion des cookies.
          </p>
          <div className="mt-4 text-xs text-white/70">Dernière mise à jour : Août 2026</div>
        </div>
      </div>

      {/* Quick Navigation Pills */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6">
        <div className="bg-white rounded-xl p-2 shadow-md border border-gray-100 flex flex-wrap gap-2 text-xs sm:text-sm">
          <a
            href="#mentions-legales"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-primary/10 hover:text-primary transition-colors font-medium text-gray-700"
          >
            <Building2 className="w-4 h-4 text-primary" />
            1. Mentions légales
          </a>
          <a
            href="#protection-donnees"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-primary/10 hover:text-primary transition-colors font-medium text-gray-700"
          >
            <Lock className="w-4 h-4 text-primary" />
            2. Données personnelles
          </a>
          <a
            href="#cookies"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-primary/10 hover:text-primary transition-colors font-medium text-gray-700"
          >
            <Cookie className="w-4 h-4 text-primary" />
            3. Gestion des cookies
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10">
        {/* ======================================================== */}
        {/* VOLET 1 : MENTIONS LÉGALES */}
        {/* ======================================================== */}
        <div id="mentions-legales" className="scroll-mt-24 mb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-2">
            <span className="w-2 h-2 rounded-full bg-primary"></span> Volet 1
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Mentions légales</h2>
        </div>

        <Section title="Éditeur du site et responsable de publication" icon={Building2}>
          <p>
            Le présent site internet accessible à l’adresse{" "}
            <span className="font-semibold text-gray-900">groupe-secretdelareussite.com</span> est édité par :
          </p>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/70 space-y-2 text-gray-800 font-medium">
            <p className="text-base text-gray-900 font-bold">Groupe Secret de la Réussite (GSR)</p>
            <p className="text-sm">Entreprise individuelle d&apos;accompagnement scolaire et de renforcement pédagogique</p>
            <p className="text-sm">
              <span className="text-gray-500 font-normal">Numéro IFU :</span> {IFU_OFFICIEL}
            </p>
            <p className="text-sm">
              <span className="text-gray-500 font-normal">Siège / Sites :</span> Cotonou, République du Bénin (Sites
              Jéricho, Yagbé - Akpakpa, Vèdoko)
            </p>
            <p className="text-sm">
              <span className="text-gray-500 font-normal">Téléphones :</span>{" "}
              <a href={`tel:${PHONE_1.replace(/\s+/g, "")}`} className="text-primary hover:underline">
                {PHONE_1}
              </a>{" "}
              /{" "}
              <a href={`tel:${PHONE_2.replace(/\s+/g, "")}`} className="text-primary hover:underline">
                {PHONE_2}
              </a>
            </p>
            <p className="text-sm">
              <span className="text-gray-500 font-normal">Email :</span>{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>
            </p>
            
          </div>
        </Section>

        <Section title="Hébergement technique" icon={Server}>
          <p>
            Le site web et les services en ligne sont hébergés par :
          </p>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/70 space-y-1 text-gray-700">
            <p className="font-semibold text-gray-900">Vercel Inc.</p>
            <p className="text-sm">440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</p>
            <p className="text-sm">
              Site web :{" "}
              <a
                href="https://vercel.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                vercel.com <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </p>
          </div>
          <p className="text-xs text-gray-500">
            La base de données et les mécanismes de gestion d’authentification sécurisée sont administrés sur une
            infrastructure cloud opérée avec Supabase, disposant de sauvegardes automatiques et d&apos;un chiffrement de pointe.
          </p>
        </Section>

        <Section title="Propriété intellectuelle et droits d'auteur" icon={Scale}>
          <p>
            L&apos;ensemble des contenus présents sur ce site (structure générale, textes, logos, emblèmes, graphismes,
            images ...) constitue
            des créations protégées par le droit de la propriété intellectuelle et le droit d&apos;auteur.
          </p>
          <p>
            Toute reproduction, représentation, modification, adaptation, retransmission ou publication, même partielle, de
            ces différents éléments est formellement interdite sans l’accord exprès, préalable et écrit de la Direction du
            Groupe Secret de la Réussite. Le non-respect de cette clause engage la responsabilité civile et pénale du
            contrefacteur.
          </p>
        </Section>

        <Section title="Liens hypertextes et limitation de responsabilité" icon={ExternalLink}>
          <p>
            Le site <span className="font-semibold text-gray-800">groupe-secretdelareussite.com</span> peut proposer des
            liens orientant vers des sites internet externes (ex. réseaux sociaux officiels). Le Groupe Secret de la Réussite ne dispose d&apos;aucun contrôle sur ces sources externes et décline
            toute responsabilité quant à leurs contenus, disponibilités ou politiques de traitement des données.
          </p>
          <p>
            GSR met en œuvre tous les moyens raisonnables pour diffuser une information vérifiée et actualisée sur ses
            programmes et tarifs. Cependant, des erreurs ou omissions peuvent survenir ; l&apos;utilisateur est invité à
            signaler toute anomalie à l&apos;adresse{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        {/* ======================================================== */}
        {/* VOLET 2 : POLITIQUE DE CONFIDENTIALITÉ */}
        {/* ======================================================== */}
        <div id="protection-donnees" className="scroll-mt-24 mb-6 mt-14">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-2">
            <span className="w-2 h-2 rounded-full bg-primary"></span> Volet 2
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Politique de confidentialité et protection des données personnelles
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Conformité aux principes de la Loi n° 2017-20 du 20 avril 2018 portant Code du numérique en République du Bénin.
          </p>
        </div>

        <Section title="Engagement de conformité au Code du numérique" icon={Shield}>
          <p>
            Le Groupe Secret de la Réussite (GSR) accorde une importance primordiale à la protection de la vie privée, à la
            confidentialité et à la sécurité des informations relatives à ses apprenants, à leurs parents ou tuteurs
            légaux, ainsi qu’à son équipe pédagogique.
          </p>
          <p>
            Les traitements de données à caractère personnel mis en œuvre sur ce site et sur les portails dédiés (Portail
            Parents, Portail TD, Administration) s&apos;effectuent dans le strict respect des principes fondamentaux édictés
            par le <strong>Livre Cinquième de la Loi n° 2017-20 du 20 avril 2018 portant Code du numérique en République du
            Bénin</strong>, notamment les principes de licéité, de loyauté, de finalité légitime, d’exactitude et de
            conservation limitée.
          </p>
        </Section>

        <Section title="Données personnelles collectées et finalités" icon={FileText}>
          <p>
            GSR ne collecte que les informations strictement nécessaires à la bonne exécution des prestations éducatives,
            au suivi scolaire et à la gestion administrative des inscriptions :
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/70">
              <h3 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Données des élèves
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Nom, prénoms, sexe, date de naissance, classe / série, établissement d&apos;origine, site GSR fréquenté,
                notes obtenues, assiduité (relevé des présences, retards, absences justifiées) et résultats scolaires.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/70">
              <h3 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Données des parents / tuteurs
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Nom, prénoms, lien de parenté, numéros de téléphone (appels et notifications WhatsApp), adresse email
                éventuelle, ville de résidence, pour la transmission des bilans scolaires et alertes d&apos;assiduité.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/70">
              <h3 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Règlements & Paiements
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Historique des versements, tranches payées, numéros de reçus de paiement. <em>Aucun code secret ni code PIN n&apos;est jamais stocké.</em>
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/70">
              <h3 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Équipe pédagogique (TD)
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Nom, prénoms, contacts, matières enseignées, fiches d&apos;émargement et suivi des séances dispensées pour
                le bon fonctionnement des travaux dirigés.
              </p>
            </div>
          </div>
        </Section>

        <Section title="Protection particulière des apprenants mineurs" icon={Lock}>
          <p>
            Une grande partie de nos apprenants étant mineure, le Groupe Secret de la Réussite applique des mesures de
            protection rigoureuses.
          </p>
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-emerald-950 text-sm leading-relaxed">
            <p className="font-semibold mb-1">Accord des parents et représentants légaux :</p>
            Toute inscription, tout traitement de données scolaires et tout accès aux bilans pédagogiques s&apos;opèrent avec
            le consentement et sous le contrôle exclusif des parents ou tuteurs légaux. Les coordonnées de contact utilisées
            pour le suivi administratif et pédagogique sont prioritairement celles des parents ou représentants légaux.
          </div>
        </Section>

        <Section title="Confidentialité et destinataires des données" icon={Shield}>
          <p>
            Vos données personnelles sont strictement confidentielles. Elles ne sont accessibles qu&apos;aux membres
            habilités de la direction et de l&apos;administration de GSR dans l&apos;exercice strict de leurs fonctions.
          </p>
          <p>
            <strong>Aucune vente ni commercialisation :</strong> Les informations personnelles recueillies par GSR ne sont
            jamais vendues, louées, cédées ou échangées à des tiers ou à des régies publicitaires, à quelque fin que ce soit.
          </p>
          <p>
            Toute transmission à un tiers n&apos;intervient qu&apos;en cas de stricte nécessité technique (ex. hébergement
            sécurisé des données) et dans le respect absolu de la
            légalité béninoise.
          </p>
        </Section>

        <Section title="Durée de conservation des données" icon={Scale}>
          <p>
            Le Groupe Secret de la Réussite ne conserve les données à caractère personnel que pour la durée strictement
            nécessaire aux finalités pour lesquelles elles ont été collectées :
          </p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>
              <strong>Dossiers scolaires et notes :</strong> conservés pendant toute la scolarité de l&apos;élève au sein de
              GSR, puis supprimés immédiatement. 
            </li>
            <li>
              <strong>Données comptables et justificatifs de paiement :</strong> conservées conformément aux délais légaux
              imposés par les obligations fiscales et comptables en vigueur au Bénin.
            </li>
            <li>
              <strong>Préinscriptions sans suite :</strong> conservées pour une durée maximale
              de 03 mois avant suppression définitive.
            </li>
          </ul>
        </Section>

        <Section title="Vos droits et voies de recours" icon={FileText}>
          <p>
            Conformément aux dispositions du Code du numérique en République du Bénin, toute personne concernée (ou son
            représentant légal pour les mineurs) dispose des droits suivants :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="font-semibold text-gray-900">Droit d&apos;accès :</span> Obtenir confirmation du traitement
              de vos données et communication d&apos;une copie compréhensible.
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="font-semibold text-gray-900">Droit de rectification :</span> Demander la correction des
              données inexactes, incomplètes ou obsolètes.
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="font-semibold text-gray-900">Droit à l&apos;effacement :</span> Demander la suppression des
              données non nécessaires aux obligations légales ou éducatives.
            </div>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="font-semibold text-gray-900">Droit d&apos;opposition :</span> S&apos;opposer à un traitement
              pour motifs légitimes sous réserve des exigences de gestion scolaire.
            </div>
          </div>

          <p>
            <strong>Comment exercer vos droits ?</strong>
            <br />
            Toute demande peut être adressée par écrit à la Direction du GSR :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>
              Par email à :{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline font-medium">
                {CONTACT_EMAIL}
              </a>
            </li>
            <li>
              Par téléphone ou WhatsApp officiel :{" "}
              <span className="font-medium text-gray-800">{PHONE_1}</span>
            </li>
            <li>Directement auprès du secrétariat de l&apos;un de nos centres à Cotonou.</li>
          </ul>

          
        </Section>

        {/* ======================================================== */}
        {/* VOLET 3 : GESTION DES COOKIES */}
        {/* ======================================================== */}
        <div id="cookies" className="scroll-mt-24 mb-6 mt-14">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-2">
            <span className="w-2 h-2 rounded-full bg-primary"></span> Volet 3
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Politique de gestion des cookies</h2>
          <p className="text-gray-600 text-sm mt-1">
            Transparence sur l’utilisation des cookies et absence de traceurs intrusifs sur notre plateforme.
          </p>
        </div>

        

        <Section title="Cookies techniques strictement nécessaires" icon={CheckCircle2}>
          <p>
            Conformément aux pratiques et dispositions applicables en République du Bénin et aux standards internationaux,
            les cookies ayant pour finalité exclusive de permettre ou faciliter la communication électronique, ou
            strictement nécessaires à la fourniture d&apos;un service expressément demandé par l&apos;utilisateur, sont{" "}
            <strong>dispensés du recueil préalable de consentement</strong>.
          </p>
          
          <p className="text-xs text-gray-500 mt-2">
            Ces cookies ne permettent aucune traçabilité publicitaire et ne sont en aucun cas communiqués à des tiers.
          </p>
        </Section>

        

        {/* Contact Footer Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200/80 shadow-sm text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Une question sur vos données personnelles ?</h3>
          <p className="text-gray-600 text-sm max-w-xl mx-auto mb-4">
            Notre équipe se tient à votre disposition pour toute précision relative à la protection de vos données ou à la
            gestion de vos droits.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-colors shadow-sm"
            >
              <Mail className="w-4 h-4" />
              Nous écrire par email
            </a>
            <a
              href={`tel:${PHONE_1.replace(/\s+/g, "")}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-800 font-medium hover:bg-gray-200 transition-colors"
            >
              <Phone className="w-4 h-4" />
              {PHONE_1}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

