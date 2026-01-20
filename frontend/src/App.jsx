import ChatWindow from "./components/ChatWindow";
import "./styles.css";

export default function App() {
  return (
    <div className="app-container">
      <ChatWindow userEmail="raj@example.com" />
    </div>
  );
}