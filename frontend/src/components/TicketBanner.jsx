export default function TicketBanner({ visible, ticketNumber, summary, onConfirm }) {
  if (!visible) return null;

  return (
    <div className="ticket-banner">
      <strong>Ticket Prepared:</strong> {summary}

      {ticketNumber ? (
        <div>✅ Ticket Created: <strong>{ticketNumber}</strong></div>
      ) : (
        <button onClick={onConfirm}>Create Ticket</button>
      )}
    </div>
  );
}