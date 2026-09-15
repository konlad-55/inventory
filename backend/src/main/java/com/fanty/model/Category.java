package com.fanty.model;

public enum Category {
    BOXER,
    FEKON,
    KINGLION,
    HAUJUE,
    TVS,
    GN;


    public static Category fromString(String value) {
        try {
            return Category.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid category: " + value);
        }
    }
}
