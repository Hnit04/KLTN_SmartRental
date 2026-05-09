package iuh.se.kltn.backend.common.config;

import org.modelmapper.ModelMapper;
import org.modelmapper.convention.MatchingStrategies;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AppConfig {

    @Bean
    public ModelMapper modelMapper() {
        ModelMapper modelMapper = new ModelMapper();
        modelMapper.getConfiguration()
                .setMatchingStrategy(MatchingStrategies.STANDARD)
                .setAmbiguityIgnored(true); // Ignore ambiguity globally to fix DTO mapping crashes caused by User bank fields

        modelMapper.typeMap(iuh.se.kltn.backend.modules.property.entity.Property.class, iuh.se.kltn.backend.modules.property.dto.response.PropertyResponse.class)
                .addMappings(mapper -> mapper.skip(iuh.se.kltn.backend.modules.property.dto.response.PropertyResponse::setImages));

        modelMapper.typeMap(iuh.se.kltn.backend.modules.property.entity.Room.class, iuh.se.kltn.backend.modules.property.dto.response.RoomResponse.class)
                .addMappings(mapper -> {
                    mapper.skip(iuh.se.kltn.backend.modules.property.dto.response.RoomResponse::setImages);
                    mapper.skip(iuh.se.kltn.backend.modules.property.dto.response.RoomResponse::setAmenities);
                    mapper.skip(iuh.se.kltn.backend.modules.property.dto.response.RoomResponse::setPanoramaImages);
                });

        return modelMapper;
    }
}