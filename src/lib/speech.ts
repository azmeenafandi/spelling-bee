/**
 * Web Speech API wrapper for pronunciation.
 *
 * speakWord returns a Promise that resolves when speech ends
 * and rejects on error. It cancels any in-progress utterance
 * before starting a new one.
 */

export function speakWord(text: string, lang: 'en-GB' | 'en-US'): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      reject(new Error('Speech synthesis not available'));
      return;
    }

    const synth = window.speechSynthesis;

    // Cancel any ongoing speech before starting a new utterance.
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      // The 'canceled' error fires when we call synth.cancel() above
      // for a *previous* utterance. Treat it as non-fatal.
      if (e.error === 'canceled') {
        resolve();
      } else {
        reject(new Error(`Speech error: ${e.error}`));
      }
    };

    synth.speak(utterance);
  });
}
