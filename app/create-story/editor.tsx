// "use client" indique à Next.js que ce composant est un "Client Component".
// Cela signifie qu'il peut utiliser des hooks React comme useState et s'exécuter
// dans le navigateur de l'utilisateur pour être interactif.
"use client";

// Importations des modules et composants nécessaires.
import { useState } from "react"; // Hook pour gérer l'état local.
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
// Composants pour créer des listes déroulantes (Select).
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Composants pour créer un groupe de boutons à bascule (ex: pour l'alignement).
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
// Importation des icônes pour les boutons d'alignement.
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";

// L'interface `EditorProps` définit la "forme" des propriétés (props) que ce composant attend.
// C'est un contrat qui garantit que le composant parent fournira les bonnes données.
export interface EditorProps {
  value: string; // `value` est le texte actuel de l'éditeur.
  onChange: (value: string) => void; // `onChange` est une fonction qui sera appelée quand le texte change.
}

// Définition du composant `Editor`. Il reçoit `value` et `onChange` comme props.
export default function Editor({ value, onChange }: EditorProps) {
  // Utilisation du hook `useState` pour gérer l'état des options de style.
  // Chaque `useState` retourne un tableau avec la valeur actuelle et une fonction pour la mettre à jour.
  const [fontSize, setFontSize] = useState("16"); // État pour la taille de la police, initialisée à "16".
  const [fontFamily, setFontFamily] = useState("Georgia"); // État pour la police, initialisée à "Georgia".
  const [textAlign, setTextAlign] = useState("left"); // État pour l'alignement du texte, initialisé à "left".

  // Tableau des polices de caractères disponibles dans l'éditeur.
  const fonts = [
    "Georgia",
    "Times New Roman",
    "Garamond",
    "Baskerville",
    "Palatino",
    "Cambria",
  ];

  // Tableau des tailles de police disponibles.
  const fontSizes = ["14", "16", "18", "20", "24", "28", "32", "36"];

  // Le JSX qui définit la structure visuelle du composant.
  return (
    // Conteneur principal avec un espacement vertical entre les enfants.
    <div className="space-y-4 w-full">
      {/* Barre d'outils contenant les contrôles de mise en forme du texte. */}
      <div className="flex items-center gap-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-4 rounded-xl border border-amber-200/30 dark:border-amber-800/30">
        {/* Sélecteur de police */}
        <div className="w-40">
          {/* Le composant `Select` est contrôlé : sa valeur est liée à l'état `fontFamily`
              et sa modification appelle `setFontFamily` pour mettre à jour l'état. */}
          <Select value={fontFamily} onValueChange={setFontFamily}>
            <SelectTrigger className="border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 text-foreground">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent className="text-foreground">
              {/* On utilise `map` pour créer dynamiquement un `SelectItem` pour chaque police dans le tableau `fonts`. */}
              {fonts.map((font) => (
                <SelectItem key={font} value={font}>
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sélecteur de taille de police */}
        <div className="w-24">
          <Select value={fontSize} onValueChange={setFontSize}>
            <SelectTrigger className="border-amber-200/50 dark:border-amber-800/50 bg-white/50 dark:bg-gray-900/50 text-foreground">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent className="text-foreground">
              {/* De même, on génère les options de taille de police à partir du tableau `fontSizes`. */}
              {fontSizes.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Groupe de boutons pour l'alignement du texte */}
        <ToggleGroup
          type="single" // "single" signifie qu'un seul bouton peut être actif à la fois.
          value={textAlign} // La valeur active est liée à l'état `textAlign`.
          onValueChange={setTextAlign} // Mettre à jour l'état quand un autre bouton est cliqué.
          className="border border-amber-200/30 dark:border-amber-800/30 rounded-lg"
        >
          {/* Chaque `ToggleGroupItem` représente une option d'alignement. */}
          <ToggleGroupItem
            value="left"
            aria-label="Align left"
            className="data-[state=on]:bg-amber-100/50 dark:data-[state=on]:bg-amber-900/50"
          >
            <AlignLeft className="h-4 w-4 text-amber-900 dark:text-amber-100" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="center"
            aria-label="Align center"
            className="data-[state=on]:bg-amber-100/50 dark:data-[state=on]:bg-amber-900/50"
          >
            <AlignCenter className="h-4 w-4 text-amber-900 dark:text-amber-100" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="right"
            aria-label="Align right"
            className="data-[state=on]:bg-amber-100/50 dark:data-[state=on]:bg-amber-900/50"
          >
            <AlignRight className="h-4 w-4 text-amber-900 dark:text-amber-100" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="justify"
            aria-label="Justify"
            className="data-[state=on]:bg-amber-100/50 dark:data-[state=on]:bg-amber-900/50"
          >
            <AlignJustify className="h-4 w-4 text-amber-900 dark:text-amber-100" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Zone de texte principale pour l'écriture */}
      <div className="w-full relative p-8">
        <textarea
          // La valeur affichée dans le textarea est la prop `value` venant du composant parent.
          value={value}
          // Quand l'utilisateur tape, l'événement `onChange` est déclenché.
          // On appelle alors la fonction `onChange` du parent avec la nouvelle valeur,
          // ce qui permet de "remonter" l'état.
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full min-h-[calc(100vh-300px)] p-8 resize-none focus:outline-none bg-transparent text-foreground placeholder:text-muted-foreground"
          // Les styles (police, taille, alignement) sont appliqués dynamiquement
          // en utilisant les valeurs de notre état local.
          style={{
            fontFamily,
            fontSize: `${fontSize}px`,
            textAlign: textAlign as "left" | "center" | "right" | "justify",
          }}
          placeholder="Start writing your story..."
        />
      </div>
    </div>
  );
}
