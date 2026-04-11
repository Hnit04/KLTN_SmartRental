// src/features/property/components/PropertyMap.tsx
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Property } from "@/types/index";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";

// Tạo custom icon vì icon mặc định của Leaflet hay bị lỗi URL trên Vite/Webpack
const customMarkerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component tự động fit bounds bản đồ dựa trên danh sách properties và vị trí người dùng
const MapBoundsFetcher = ({ properties, userLocation }: { properties: Property[], userLocation: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    const latLngs: L.LatLngExpression[] = properties
      .filter(p => p.latitude && p.longitude)
      .map(p => [p.latitude!, p.longitude!]);

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

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Bán kính trái đất (km)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c;
}

interface PropertyMapProps {
  properties: Property[];
}

const userLocationIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function PropertyMap({ properties }: PropertyMapProps) {
  // Những properties có toạ độ hợp lệ
  const mapProperties = properties.filter((p) => p.latitude && p.longitude);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    }
  }, []);

  // Toạ độ mặc định (Trung tâm TP.HCM)
  const defaultCenter: [number, number] = [10.8231, 106.6297];

  return (
    <div className="w-full h-[600px] sm:h-[70vh] rounded-2xl overflow-hidden border shadow-sm z-0 relative">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="w-full h-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Vị trí của người dùng hiện tại */}
        {userLocation && (
          <Marker position={userLocation} icon={userLocationIcon}>
            <Popup className="font-semibold text-sm">📍 Vị trí hiện tại của bạn</Popup>
          </Marker>
        )}

        {mapProperties.map((property) => {
          const distance = userLocation 
            ? calculateDistance(userLocation[0], userLocation[1], property.latitude!, property.longitude!)
            : null;

          return (
          <Marker
            key={property.id}
            position={[property.latitude!, property.longitude!]}
            icon={customMarkerIcon}
          >
            <Popup className="property-popup">
              <div className="w-48 sm:w-60 p-1">
                <Link to={`/properties/${property.id}`} className="block group">
                  <div className="h-32 mb-2 rounded-lg overflow-hidden relative bg-gray-100">
                    <img
                      src={property.images && property.images.length > 0 ? property.images[0] : "https://placehold.co/400x300?text=No+Image"}
                      alt={property.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-primary text-xs font-bold px-2 py-1 rounded shadow-sm">
                      {property.minPrice
                          ? `${(property.minPrice / 1000000).toFixed(1)} triệu`
                          : "Đang cập nhật"}
                    </div>
                    {distance !== null && (
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-1 rounded flex items-center gap-1 backdrop-blur-sm shadow-sm">
                        📍 Cách {distance < 1 ? 'chưa tới 1' : distance.toFixed(1)} km
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">
                    {property.name}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-1 flex items-center gap-1">
                    {property.district}, {property.city}
                  </p>
                </Link>
              </div>
            </Popup>
          </Marker>
        )})}

        <MapBoundsFetcher properties={mapProperties} userLocation={userLocation} />
      </MapContainer>
    </div>
  );
}
