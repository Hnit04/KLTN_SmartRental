// src/features/property/components/PropertyMap.tsx
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Property } from "@/types/index";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { LocateFixed } from "lucide-react";
import "leaflet/dist/leaflet.css";

const customMarkerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userLocationIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const MapBoundsFetcher = ({
  properties,
  userLocation,
}: {
  properties: Property[];
  userLocation: [number, number] | null;
}) => {
  const map = useMap();

  useEffect(() => {
    const latLngs: L.LatLngExpression[] = properties
      .filter((p) => p.latitude != null && p.longitude != null)
      .map((p) => [p.latitude as number, p.longitude as number]);

    if (userLocation) {
      latLngs.push(userLocation);
    }

    if (latLngs.length === 0) return;

    const bounds = L.latLngBounds(latLngs);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, properties, userLocation]);

  return null;
};

const MapInstanceBridge = ({ onMapReady }: { onMapReady: (map: L.Map) => void }) => {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  return null;
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface PropertyMapProps {
  properties: Property[];
}

export default function PropertyMap({ properties }: PropertyMapProps) {
  const mapProperties = properties.filter((p) => p.latitude != null && p.longitude != null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        console.error("Error getting user location:", error);
      }
    );
  }, []);

  const focusOnUserLocation = () => {
    if (!navigator.geolocation) return;

    if (userLocation && mapInstance) {
      mapInstance.flyTo(userLocation, Math.max(mapInstance.getZoom(), 15), {
        duration: 0.8,
        animate: true,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const current: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(current);
        if (mapInstance) {
          mapInstance.flyTo(current, Math.max(mapInstance.getZoom(), 15), {
            duration: 0.8,
            animate: true,
          });
        }
      },
      (error) => {
        console.error("Error getting user location:", error);
      }
    );
  };

  const defaultCenter: [number, number] = [10.8231, 106.6297];

  return (
    <div className="relative z-0 h-[600px] w-full overflow-hidden rounded-2xl border shadow-sm sm:h-[70vh]">
      <MapContainer center={defaultCenter} zoom={12} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup className="font-semibold text-sm">📍 Vị trí hiện tại của bạn</Popup>
          </Marker>
        )}

        {mapProperties.map((property) => {
          const distance =
            property.distanceKm != null
              ? Number(property.distanceKm)
              : userLocation
                ? calculateDistance(
                    userLocation[0],
                    userLocation[1],
                    property.latitude as number,
                    property.longitude as number
                  )
                : null;

          return (
            <Marker
              key={property.id}
              position={[property.latitude as number, property.longitude as number]}
              icon={customMarkerIcon}
            >
              <Popup className="property-popup">
                <div className="w-48 p-1 sm:w-60">
                  <Link to={`/properties/${property.id}`} className="group block">
                    <div className="relative mb-2 h-32 overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={
                          property.images && property.images.length > 0
                            ? property.images[0]
                            : "https://placehold.co/400x300?text=No+Image"
                        }
                        alt={property.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-xs font-bold text-primary shadow-sm backdrop-blur-sm">
                        {property.minPrice && property.minPrice > 0
                          ? `Từ ${(property.minPrice / 1000000).toFixed(1)} triệu/tháng`
                          : "Hết phòng"}
                      </div>
                      {distance !== null && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm">
                          📍 Cách {distance < 1 ? "chưa tới 1" : distance.toFixed(1)} km
                        </div>
                      )}
                    </div>
                    <h3 className="mb-1 line-clamp-2 text-sm font-bold leading-tight text-gray-900 transition-colors group-hover:text-primary">
                      {property.name}
                    </h3>
                    <p className="line-clamp-1 flex items-center gap-1 text-xs text-gray-500">
                      {property.district}, {property.city}
                    </p>
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <MapBoundsFetcher properties={mapProperties} userLocation={userLocation} />
        <MapInstanceBridge onMapReady={setMapInstance} />
      </MapContainer>

      <button
        type="button"
        onClick={focusOnUserLocation}
        className="absolute bottom-4 right-4 z-[1000] inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-border bg-white/95 px-3 text-xs font-semibold text-foreground shadow-lg backdrop-blur transition hover:bg-white hover:shadow-xl"
        aria-label="Vị trí của tôi"
      >
        <LocateFixed className="h-4 w-4 text-primary" />
        <span className="hidden sm:inline">Vị trí của tôi</span>
      </button>
    </div>
  );
}
