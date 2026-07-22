import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

interface CompteCreeEmailProps {
  prenom: string;
  email: string;
  motDePasseTemporaire: string;
  urlConnexion: string;
}

export default function CompteCreeEmail({
  prenom,
  email,
  motDePasseTemporaire,
  urlConnexion,
}: CompteCreeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Votre compte ITA Digital a été créé</Preview>
      <Body style={{ fontFamily: "Open Sans, sans-serif", backgroundColor: "#f4f4f5" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            padding: "24px",
            borderRadius: "8px",
            margin: "40px auto",
            maxWidth: "480px",
          }}
        >
          <Heading style={{ color: "#002A5C", fontSize: "20px" }}>
            Bonjour {prenom},
          </Heading>
          <Text style={{ color: "#111827", fontSize: "14px" }}>
            Votre compte ITA Digital a été créé.
          </Text>
          <Text style={{ color: "#111827", fontSize: "14px" }}>
            Email : {email}
            <br />
            Mot de passe temporaire : {motDePasseTemporaire}
          </Text>
          <Text style={{ color: "#111827", fontSize: "14px" }}>
            Vous devrez le changer à votre première connexion. Connectez-vous sur{" "}
            {urlConnexion}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
