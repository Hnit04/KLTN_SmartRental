package iuh.se.kltn.backend.common.utils;


import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.List;

@Converter
public class LockReasonConverter implements AttributeConverter<List<String>, String> {
    @Override
    public String convertToDatabaseColumn(List<String> attribute) {
        return JsonUtil.convertListToJson(attribute);
    }

    @Override
    public List<String> convertToEntityAttribute(String dbData) {
        return JsonUtil.convertJsonToList(dbData);
    }
}