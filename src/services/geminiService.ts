export const suggestTagsForPrompt = async (
  promptContent: string
): Promise<string[]> => {
  try {
    const response = await fetch("/api/suggest-tags", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ promptContent }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch tags from the server.");
    }

    const data = await response.json();
    return data.tags;
  } catch (error) {
    console.error("Error suggesting tags:", error);
    return [];
  }
};
