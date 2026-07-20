import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

/**
 * Template d'exemple validant le pipeline react-email/Resend pour ce lot.
 * Non branché à un envoi réel — les futurs modules métier créeront leurs
 * propres templates sur ce modèle (ex: notification de validation Achat).
 */
interface ExempleNotificationEmailProps {
  prenom: string;
  message: string;
}

export default function ExempleNotificationEmail({
  prenom,
  message,
}: ExempleNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{message}</Preview>
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
          <Text style={{ color: "#111827", fontSize: "14px" }}>{message}</Text>
        </Container>
      </Body>
    </Html>
  );
}
