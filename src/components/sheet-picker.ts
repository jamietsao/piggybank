"use client";

// This small boundary is the only browser integration with Google. Picker
// chooses a file; the server still validates it against the account connection.
type PickerDocument = { id: string };
type PickerEvent = { action: string; docs?: PickerDocument[] };
type PickerView = { setMimeTypes(value: string): PickerView; setIncludeFolders(value: boolean): PickerView; setSelectFolderEnabled(value: boolean): PickerView };
type PickerBuilder = {
  setDeveloperKey(value: string): PickerBuilder; setAppId(value: string): PickerBuilder;
  setOAuthToken(value: string): PickerBuilder; setOrigin(value: string): PickerBuilder;
  setTitle(value: string): PickerBuilder; addView(value: PickerView): PickerBuilder;
  setCallback(value: (data: PickerEvent) => void): PickerBuilder;
  build(): { setVisible(value: boolean): void };
};
declare global {
  interface Window {
    gapi?: { load(name: string, options: { callback: () => void; onerror: () => void; timeout: number; ontimeout: () => void }): void };
    google?: { picker: { DocsView: new () => PickerView; PickerBuilder: new () => PickerBuilder; Action: { PICKED: string; CANCEL: string } } };
  }
}

let loading: Promise<void> | undefined;
function loadPicker(): Promise<void> {
  loading ??= new Promise<void>((resolve, reject) => {
    const load = () => window.gapi!.load("picker", { callback: resolve, onerror: () => reject(new Error("Could not load Google Picker.")), timeout: 15_000, ontimeout: () => reject(new Error("Google Picker took too long to load.")) });
    if (window.gapi) { load(); return; }
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = load;
    script.onerror = () => reject(new Error("Could not load Google Picker. Check your connection."));
    document.head.appendChild(script);
  }).catch(error => { loading = undefined; throw error; });
  return loading;
}

export async function chooseSpreadsheet(credentials: { apiKey: string; appId: string; pickerToken: string }): Promise<string | null> {
  await loadPicker();
  const picker = window.google!.picker;
  return new Promise(resolve => {
    const view = new picker.DocsView().setMimeTypes("application/vnd.google-apps.spreadsheet").setIncludeFolders(false).setSelectFolderEnabled(false);
    new picker.PickerBuilder()
      .setDeveloperKey(credentials.apiKey).setAppId(credentials.appId).setOAuthToken(credentials.pickerToken)
      .setOrigin(window.location.origin).setTitle("Choose your piggybank spreadsheet").addView(view)
      .setCallback(data => { if (data.action === picker.Action.PICKED) resolve(data.docs?.[0]?.id || null); if (data.action === picker.Action.CANCEL) resolve(null); })
      .build().setVisible(true);
  });
}
