import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/constants/theme';

type ShoppingListItemProps = {
    name: string;
    amount: string;
    group: string;
};

export function ShoppingListItem({ name, amount, group }: ShoppingListItemProps) {
    return (
        <View style={styles.row}>
            <View style={styles.leftRow}>
                <Pressable style={styles.checkCircle} />
                <View>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.group}>{group}</Text>
                </View>
            </View>
            <Text style={styles.amount}>{amount}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        borderRadius: theme.radius.sm,
        backgroundColor: theme.colors.background.secondary,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    leftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    checkCircle: {
        width: 18,
        height: 18,
        borderRadius: theme.radius.full,
        borderWidth: 1.5,
        borderColor: theme.colors.ui.divider,
        backgroundColor: theme.colors.background.main,
    },
    name: {
        color: theme.colors.text.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    group: {
        marginTop: 1,
        color: theme.colors.text.muted,
        fontSize: 11,
        fontWeight: '500',
    },
    amount: {
        color: theme.colors.text.secondary,
        fontSize: 12,
        fontWeight: '600',
    },
});
