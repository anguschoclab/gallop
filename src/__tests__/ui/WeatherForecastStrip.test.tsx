import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WeatherForecastStrip } from "@/components/races/WeatherForecastStrip";
import { useGame } from "@/game/store";
import type { WeatherState } from "@/core/weather";

// Mock useGame
vi.mock("@/game/store", () => ({
  useGame: vi.fn(),
  useGameWithShallow: vi.fn(),
}));

describe("WeatherForecastStrip Snapshot Tests", () => {
  const mockTrackId = "test-track";
  
  const createMockForecast = (patterns: ("clear" | "overcast" | "shower" | "rain" | "storm")[]): WeatherState[] => {
    return patterns.map((pattern, i) => ({
      trackId: mockTrackId,
      day: i + 1,
      pattern,
      tempC: 20 + i,
      humidity: 0.5 + i * 0.1,
    }));
  };

  it("renders correctly for clear weather", () => {
    const forecast = createMockForecast(["clear", "clear", "clear", "clear", "clear", "clear", "clear"]);
    const current = forecast[0];
    
    (useGame as any).mockImplementation((selector: any) => {
      const state = {
        weather: {
          forecast: { [mockTrackId]: forecast },
          byTrack: { [mockTrackId]: [current] },
        },
      };
      return selector(state);
    });

    const { asFragment } = render(<WeatherForecastStrip trackId={mockTrackId} trackCondition="fast" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders correctly for overcast weather", () => {
    const forecast = createMockForecast(["overcast", "overcast", "overcast", "overcast", "overcast", "overcast", "overcast"]);
    const current = forecast[0];
    
    (useGame as any).mockImplementation((selector: any) => {
      const state = {
        weather: {
          forecast: { [mockTrackId]: forecast },
          byTrack: { [mockTrackId]: [current] },
        },
      };
      return selector(state);
    });

    const { asFragment } = render(<WeatherForecastStrip trackId={mockTrackId} trackCondition="good" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders correctly for shower weather", () => {
    const forecast = createMockForecast(["shower", "shower", "shower", "shower", "shower", "shower", "shower"]);
    const current = forecast[0];
    
    (useGame as any).mockImplementation((selector: any) => {
      const state = {
        weather: {
          forecast: { [mockTrackId]: forecast },
          byTrack: { [mockTrackId]: [current] },
        },
      };
      return selector(state);
    });

    const { asFragment } = render(<WeatherForecastStrip trackId={mockTrackId} trackCondition="soft" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders correctly for rain weather", () => {
    const forecast = createMockForecast(["rain", "rain", "rain", "rain", "rain", "rain", "rain"]);
    const current = forecast[0];
    
    (useGame as any).mockImplementation((selector: any) => {
      const state = {
        weather: {
          forecast: { [mockTrackId]: forecast },
          byTrack: { [mockTrackId]: [current] },
        },
      };
      return selector(state);
    });

    const { asFragment } = render(<WeatherForecastStrip trackId={mockTrackId} trackCondition="heavy" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders correctly for storm weather", () => {
    const forecast = createMockForecast(["storm", "storm", "storm", "storm", "storm", "storm", "storm"]);
    const current = forecast[0];
    
    (useGame as any).mockImplementation((selector: any) => {
      const state = {
        weather: {
          forecast: { [mockTrackId]: forecast },
          byTrack: { [mockTrackId]: [current] },
        },
      };
      return selector(state);
    });

    const { asFragment } = render(<WeatherForecastStrip trackId={mockTrackId} trackCondition="heavy" />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders a mix of patterns correctly", () => {
    const forecast = createMockForecast(["clear", "overcast", "shower", "rain", "storm", "clear", "overcast"]);
    const current = forecast[0];
    
    (useGame as any).mockImplementation((selector: any) => {
      const state = {
        weather: {
          forecast: { [mockTrackId]: forecast },
          byTrack: { [mockTrackId]: [current] },
        },
      };
      return selector(state);
    });

    const { asFragment } = render(<WeatherForecastStrip trackId={mockTrackId} trackCondition="good" />);
    expect(asFragment()).toMatchSnapshot();
  });
});
