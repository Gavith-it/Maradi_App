import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../styles/theme';

interface ActionCardProps {
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    colors: readonly [string, string, ...string[]];
    onPress: () => void;
    badgeCount?: number;
}

export const ActionCard: React.FC<ActionCardProps> = ({ title, subtitle, icon, colors, onPress, badgeCount }) => {
    return (
        <TouchableOpacity style={styles.cardContainer} onPress={onPress} activeOpacity={0.8}>
            <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <View style={styles.iconContainer}>
                    {icon}
                    {badgeCount !== undefined && badgeCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{badgeCount}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{title}</Text>
                    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        width: '48%',
        marginBottom: theme.spacing.md,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: 'white',
        ...theme.shadows.medium,
    },
    gradient: {
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        height: 160,
        justifyContent: 'space-between',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        backgroundColor: theme.colors.error,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: 'white',
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    textContainer: {
        marginTop: 'auto',
    },
    title: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
    },
});
