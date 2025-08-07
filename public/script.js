<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modern Chatbot</title>
    <style>
        :root {
            /* Theme Colors */
            --primary-color: #222;
            --secondary-color: #333;
            --accent-color: #007bff; /* Modern Blue */
            --text-color: #eee;
            --light-bg: #f4f4f4;
            --light-text: #333;
            --shadow-color: rgba(0, 0, 0, 0.3);

            /* Spacing */
            --padding-small: 0.5rem;
            --padding-medium: 1rem;
            --padding-large: 1.5rem;
            --border-radius: 0.75rem;
            --transition-duration: 0.3s;

            /* Font */
            --font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            --font-size-base: 1rem;
        }

        /* Dark Theme (Default) */
        body {
            font-family: var(--font-family);
            font-size: var(--font-size-base);
            color: var(--text-color);
            background-color: var(--primary-color);
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }

        header {
            background: linear-gradient(135deg, var(--accent-color), var(--secondary-color));
            color: var(--text-color);
            padding: var(--padding-medium);
            text-align: center;
            box-shadow: 0 2px 5px var(--shadow-color);
        }

        nav {
            background-color: var(--secondary-color);
            padding: var(--padding-small) var(--padding-medium);
        }

        nav ul {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            justify-content: center;
        }

        nav li {
            margin: 0 var(--padding-medium);
        }

        nav a {
            color: var(--text-color);
            text-decoration: none;
            padding: var(--padding-small) var(--padding-medium);
            border-radius: var(--border-radius);
            transition: background-color var(--transition-duration), color var(--transition-duration);
            display: block;
        }

        nav a:hover, nav a:focus {
            background-color: rgba(255, 255, 255, 0.1);
        }

        main {
            flex: 1;
            padding: var(--padding-medium);
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .chat-container {
            width: 100%;
            max-width: 800px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: var(--border-radius);
            padding: var(--padding-medium);
            box-shadow: 0 5px 15px var(--shadow-color);
            overflow-y: auto;
            flex-grow: 1;
            margin-bottom: var(--padding-medium);
        }

        .chat-message {
            padding: var(--padding-small) var(--padding-medium);
            border-radius: var(--border-radius);
            margin-bottom: var(--padding-small);
            word-wrap: break-word; /* Prevents long words from overflowing */
        }

        .user-message {
            background-color: var(--accent-color);
            color: var(--text-color);
            align-self: flex-end;
        }

        .bot-message {
            background-color: var(--secondary-color);
            color: var(--text-color);
            align-self: flex-start;
        }

        .input-area {
            display: flex;
            width: 100%;
            max-width: 800px;
            padding: var(--padding-medium);
            background: var(--secondary-color);
            border-radius: var(--border-radius);
            box-shadow: 0 2px 5px var(--shadow-color);
        }

        #messageInput {
            flex-grow: 1;
            padding: var(--padding-small) var(--padding-medium);
            border: none;
            border-radius: var(--border-radius);
            margin-right: var(--padding-small);
            background-color: rgba(255, 255, 255, 0.1);
            color: var(--text-color);
            outline: none;
            transition: background-color var(--transition-duration);
        }

        #messageInput:focus {
            background-color: rgba(255, 255, 255, 0.2);
        }

        #sendButton {
            padding: var(--padding-small) var(--padding-medium);
            border: none;
            border-radius: var(--border-radius);
            background-color: var(--accent-color);
            color: var(--text-color);
            cursor: pointer;
            transition: background-color var(--transition-duration);
            font-weight: bold;
        }

        #sendButton:hover {
            background-color: #0056b3; /* Darker Shade */
        }

        footer {
            background-color: var(--secondary-color);
            color: var(--text-color);
            text-align: center;
            padding: var(--padding-medium);
            font-size: 0.85rem;
        }

        /* Light Theme (Optional) */
        .light-theme {
            --primary-color: #eee;
            --secondary-color: #ddd;
            --accent-color: #007bff;
            --text-color: #333;
            --light-bg: #fff;
            --light-text: #333;
            --shadow-color: rgba(0, 0, 0, 0.1);
        }

        /* Mobile Responsiveness */
        @media (max-width: 600px) {
            nav ul {
                flex-direction: column;
                align-items: center;
            }
            nav li {
                margin: var(--padding-small) 0;
            }
            .input-area {
                flex-direction: column;
            }
            #messageInput {
                margin-right: 0;
                margin-bottom: var(--padding-small);
            }
        }

        /* Smooth Scroll */
        html {
            scroll-behavior: smooth;
        }
    </style>
</head>
<body>
    <header>
        <h1>Modern Chatbot</h1>
    </header>

    <nav>
        <ul>
            <li><a href="#">Home</a></li>
            <li><a href="#">Features</a></li>
            <li><a href="#">About</a></li>
            <li><a href="#">Contact</a></li>
        </ul>
    </nav>

    <main>
        <div class="chat-container" id="chatContainer">
            <!-- Chat messages will be added here -->
        </div>

        <div class="input-area">
            <input type="text" id="messageInput" placeholder="Type your message..." aria-label="Enter your message">
            <button id="sendButton">Send</button>
        </div>
    </main>

    <footer>
        <p>&copy; 2024 Modern Chatbot. All rights reserved.</p>
    </footer>

    <script>
        // JavaScript (ES6+)
        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');

        // Function to add a message to the chat
        function addMessage(message, sender) {
            const messageElement = document.createElement('div');
            messageElement.classList.add('chat-message', `${sender}-message`);
            messageElement.textContent = message;
            chatContainer.appendChild(messageElement);
            chatContainer.scrollTop = chatContainer.scrollHeight; // Auto-scroll to the bottom
        }

        // Function to handle bot responses (Example)
        function getBotResponse(userMessage) {
            const lowerCaseMessage = userMessage.toLowerCase();

            if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi')) {
                return "Hello there!";
            } else if (lowerCaseMessage.includes('how are you')) {
                return "I am doing well, thank you!";
            } else if (lowerCaseMessage.includes('bye') || lowerCaseMessage.includes('goodbye')) {
                return "Goodbye! Have a great day!";
            } else {
                return "I'm sorry, I don't understand.";
            }
        }

        // Event listener for the send button
        sendButton.addEventListener('click', () => {
            const userMessage = messageInput.value.trim();
            if (userMessage !== "") {
                addMessage(userMessage, 'user');
                messageInput.value = ''; // Clear the input field

                // Simulate a bot response after a delay
                setTimeout(() => {
                    const botResponse = getBotResponse(userMessage);
                    addMessage(botResponse, 'bot');
                }, 500);
            }
        });

        // Event listener for pressing Enter key
        messageInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                sendButton.click(); // Trigger the send button click
            }
        });

        // Initial Welcome Message
        addMessage("Hello! I'm a chatbot. How can I help you?", 'bot');

    </script>
</body>
</html>