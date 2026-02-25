class StorageManager {
  constructor(user) {
    this.user = user;
    this.key = "arcMessages_" + user.toLowerCase();
  }

  getMessages() {
    return JSON.parse(localStorage.getItem(this.key)) || [];
  }

  saveMessage(message) {
    const messages = this.getMessages();
    messages.push(message);
    localStorage.setItem(this.key, JSON.stringify(messages));
  }

  clear() {
    localStorage.removeItem(this.key);
  }
}