import mission from "./mission.json";
import markets from "./markets.json";
import training from "./training.json";
import reading from "./reading.json";

/** The fictional data of the "mock" source, by panel id. A new panel with data adds its JSON here. */
export const MOCK_DATA: Record<string, unknown> = { mission, markets, training, reading };
