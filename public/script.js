<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modern Chatbot</title>
    <style>
        :root {
            --primary-color: #64b5f6; /* Light Blue */
            --secondary-color: #1e88e5; /* Darker Blue */
            --accent-color: #ff4081; /* Pink Accent */
            --background-color: #f0f4c3; /* Light Green */
            --text-color: #212121; /* Dark Text */
            --light-text-color: #ffffff; /* Light Text */
            --border-color: rgba(0, 0, 0, 0.1);
            --shadow-color: rgba(0, 0, 0, 0.2);
            --font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            --font-size-base: 1rem;
            --spacing-small: 0.5rem;
            --spacing-medium: 1rem;
            --spacing-large: 1.5rem;

            --gradient-primary: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            --glass-background: rgba(255, 255, 255, 0.2);
            --glass-border: rgba(255, 255, 255, 0.3);
        }

        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--font-family);
            font-size: var(--font-size-base);
            color: var(--text-color);
            background-color: var(--background-color);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: var(--spacing-medium);
        }

        .container {
            width: 100%;
            max-width: 450px;
            background: var(--glass-background);
            border-radius: 1.5rem;
            overflow: hidden;
            box-shadow: 0 10px 20px var(--shadow-color);
            backdrop-filter: blur(10px);
            border: 1px solid var(--glass-border);
            display: flex;
            flex-direction: column;
            height: 80vh;
        }

        header {
            padding: var(--spacing-medium);
            background: var(--gradient-primary);
            color: var(--light-text-color);
            text-align: center;
            font-size: 1.4rem;
            font-weight: 600;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

        .chat-area {
            flex-grow: 1;
            padding: var(--spacing-medium);
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: var(--secondary-color) var(--glass-background);
        }

        .chat-area::-webkit-scrollbar {
            width: 8px;
        }

        .chat-area::-webkit-scrollbar-track {
            background: var(--glass-background);
        }

        .chat-area::-webkit-scrollbar-thumb {
            background-color: var(--secondary-color);
            border-radius: 4px;
        }


        .message {
            margin-bottom: var(--spacing-medium);
            padding: var(--spacing-small) var(--spacing-medium);
            border-radius: 1.25rem;
            box-shadow: 0 4px 8px var(--shadow-color);
            position: relative;
        }

        .message.user {
            background: var(--glass-background);
            color: var(--text-color);
            align-self: flex-end;
        }

        .message.bot {
            background: var(--primary-color);
            color: var(--light-text-color);
            align-self: flex-start;
        }

        .message p {
            word-break: break-word;
            line-height: 1.4;
        }


        .input-area {
            padding: var(--spacing-medium);
            display: flex;
            align-items: center;
            background: var(--glass-background);
            border-top: 1px solid var(--border-color);
        }

        input[type="text"] {
            flex-grow: 1;
            padding: var(--spacing-small) var(--spacing-medium);
            border: none;
            border-radius: 1.25rem;
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-color);
            font-size: var(--font-size-base);
            outline: none;
            transition: background-color 0.2s ease-in-out;
        }

        input[type="text"]:focus {
            background-color: rgba(255, 255, 255, 0.2);
        }

        button {
            padding: var(--spacing-small) var(--spacing-medium);
            border: none;
            border-radius: 1.25rem;
            background: var(--accent-color);
            color: var(--light-text-color);
            font-size: var(--font-size-base);
            cursor: pointer;
            margin-left: var(--spacing-medium);
            transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }

        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 10px var(--shadow-color);
        }

        button:active {
            transform: translateY(0);
            box-shadow: 0 2px 5px var(--shadow-color);
        }

        /* CSS Icons (replace with more refined shapes/svgs) */
        button::before {
            content: '\27A4'; /* Right Arrow */
            margin-right: 0.5rem;
        }


        /* Responsive Design */
        @media (max-width: 600px) {
            .container {
                width: 95%;
            }
        }

    </style>
</head>
<body>
    <div class="container">
        <header>
            Chatbot
        </header>
        <main class="chat-area">
            <!-- Messages will be dynamically added here -->
        </main>
        <div class="input-area">
            <input type="text" id="userInput" placeholder="Type your message...">
            <button id="sendButton">Send</button>
        </div>
    </div>

    <script>
        // JavaScript (ES6+)
        const chatArea = document.querySelector('.chat-area');
        const userInput = document.getElementById('userInput');
        const sendButton = document.getElementById('sendButton');

        // Function to add a message to the chat
        function addMessage(message, sender) {
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', sender);
            const paragraph = document.createElement('p');
            paragraph.textContent = message;
            messageElement.appendChild(paragraph);
            chatArea.appendChild(messageElement);
            chatArea.scrollTop = chatArea.scrollHeight; // Auto-scroll to bottom
        }

        // Simple NLU (replace with a more robust solution)
        function getIntent(message) {
            const lowerCaseMessage = message.toLowerCase();

            if (lowerCaseMessage.includes('hello') || lowerCaseMessage.includes('hi')) {
                return 'greeting';
            } else if (lowerCaseMessage.includes('how are you')) {
                return 'howAreYou';
            } else if (lowerCaseMessage.includes('bye') || lowerCaseMessage.includes('goodbye')) {
                return 'goodbye';
            } else if (lowerCaseMessage.includes('weather')) {
              return 'weather';
            }
            else {
                return 'unknown';
            }
        }

        function getBotResponse(intent) {
            switch (intent) {
                case 'greeting':
                    return "Hello! How can I help you today?";
                case 'howAreYou':
                    return "I'm doing well, thanks for asking!";
                case 'goodbye':
                    return "Goodbye! Have a great day.";
                case 'weather':
                    return "I am unable to fetch the weather at this time, but I'm always learning.";
                case 'unknown':
                    return "I'm sorry, I didn't understand.  Could you please rephrase?";
                default:
                    return "I'm sorry, I didn't understand.  Could you please rephrase?";
            }
        }



        // Event listener for the send button
        sendButton.addEventListener('click', () => {
            const userMessage = userInput.value.trim();
            if (userMessage) {
                addMessage(userMessage, 'user');
                userInput.value = '';

                // Simulate a bot response after a short delay (for realism)
                setTimeout(() => {
                    const intent = getIntent(userMessage);
                    const botResponse = getBotResponse(intent);
                    addMessage(botResponse, 'bot');
                }, 500);
            }
        });

        // Event listener for Enter key
        userInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                sendButton.click(); // Trigger the send button click
            }
        });
    </script>
</body>
</html>